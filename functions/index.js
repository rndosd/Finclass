// functions/index.js

// ✅ Firebase Admin SDK
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const authAdmin = admin.auth();

// ✅ Firebase Functions v2
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

setGlobalOptions({ region: "asia-northeast3" });


// ✅ 외부 라이브러리
const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// ✅ Firestore Helper 함수들 (Admin SDK 기준으로 사용됨)
const {
    getFirestore,
    Timestamp,
    FieldValue,
    serverTimestamp,
    increment,
} = require('firebase-admin/firestore');

// ✅ dayjs 플러그인 활성화
dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ 유틸리티 함수들 (파일 경로는 프로젝트에 맞게 수정)
const {
    parseDateSafe,
    generateTimeframeChartData,
    splitAndSetDoc,
} = require("./utils/firestoreUtils");

const {
    getPrefetchContext,
    fetchAllSymbols,
    US_STOCK_MARKET_HOLIDAYS
} = require('./utils/prefetchUtils');

// 🔹 Firestore 기반 권한 확인 함수
const hasPermission = async (uid, classId, requiredKey) => {
    const docSnap = await db.doc(`classes/${classId}/students/${uid}`).get();
    const data = docSnap.exists ? docSnap.data() : {};
    const permissions = typeof data.permissions === 'object' && data.permissions !== null ? data.permissions : {};
    return !!permissions[requiredKey];
};


// ✅ Secret Parameter 예시 (FMP API Key)
const fmpApiKeyParam = defineSecret("FMP_API_KEY");

// ✅ 컬렉션 이름 상수화
const MARKET_CACHE_COLLECTION = "stockMarketCache";
const CHART_CACHE_COLLECTION = "stockChartCache";
const CHART_SUMMARY_COLLECTION = "stockChartSummary";
const QUOTE_SUMMARY_COLLECTION = "stockMarketSummary";

/**
 * 특정 사용자에게 'admin' 역할을 부여하는 함수 (최초 1회 실행용)
 */
exports.addAdminRole = onCall(async (request) => {
    // 이메일을 받아 해당 사용자를 찾습니다.
    const email = request.data.email;
    try {
        const user = await authAdmin.getUserByEmail(email);
        // 해당 사용자에게 'admin' 역할을 커스텀 클레임으로 설정합니다.
        await authAdmin.setCustomUserClaims(user.uid, { role: 'admin' });
        return { message: `성공! ${email} 사용자에게 admin 역할이 부여되었습니다.` };
    } catch (error) {
        console.error("Error setting custom claim:", error);
        throw new HttpsError('internal', '역할 설정 중 오류가 발생했습니다.');
    }
});

// ✅ 3. 교사 계정 요청 처리 함수
exports.requestTeacherAccount = onCall({ region: 'asia-northeast3', cors: true }, async (request) => {
    const { name, email, password, requestedClassId, classDocId } = request.data;

    if (!name || !email || !password || !requestedClassId || !classDocId) {
        throw new HttpsError("invalid-argument", "모든 필드를 입력해주세요.");
    }

    try {
        // 이메일 중복 확인
        const userExists = await authAdmin.getUserByEmail(email).catch(err => {
            if (err.code === 'auth/user-not-found') return null;
            throw err;
        });
        if (userExists) {
            throw new HttpsError("already-exists", "auth/email-already-exists");
        }

        // 학급 ID 중복 확인 (문서 ID 기준)
        const classSnap = await db.doc(`classes/${requestedClassId}`).get();
        if (classSnap.exists) {
            throw new HttpsError("already-exists", "class_already_exists");
        }

        // 사용자 생성
        const newUser = await authAdmin.createUser({ email, password, displayName: name });

        // 대기중 교사 문서 생성
        await db.doc(`users/${newUser.uid}`).set({
            uid: newUser.uid,
            name,
            email,
            role: "teacher",
            status: "pending",
            requestedClassId, // 무작위 ID (문서 ID)
            classDocId,       // 사람이 읽을 수 있는 학급 이름
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true, message: "교사 계정 신청이 완료되었습니다." };
    } catch (error) {
        console.error("requestTeacherAccount error:", error);
        if (error.code && error.httpErrorCode) throw error;
        throw new HttpsError("internal", error.message || "서버 오류 발생");
    }
});

/**
 * 관리자가 '승인 대기' 상태의 교사를 최종 승인하고,
 * 해당 교사의 학급과 관련 문서를 생성합니다.
 * @param {object} data - 클라이언트에서 전달한 데이터. { teacherUid, requestedClassId, teacherName }
 * @param {object} context - 함수를 호출한 사용자의 인증 정보.
 * @returns {object} 성공 또는 실패 메시지
 */
exports.approveTeacher = onCall({ region: 'asia-northeast3', cors: true }, async (request) => {
    if (request.auth?.token.role !== 'admin') {
        throw new HttpsError('permission-denied', '이 작업을 수행할 수 있는 권한이 없습니다.');
    }

    const { teacherUid, requestedClassDocId, teacherName } = request.data;

    if (!teacherUid || !requestedClassDocId || !teacherName) {
        throw new HttpsError('invalid-argument', '필수 정보가 누락되었습니다.');
    }

    try {
        // ✅ 고유한 Firestore-safe classId 생성
        const generatedClassId = db.collection('classes').doc().id;

        // ✅ Firestore 경로 지정
        const userDocRef = db.doc(`users/${teacherUid}`);
        const classDocRef = db.doc(`classes/${generatedClassId}`);
        const studentDocRef = db.doc(`classes/${generatedClassId}/students/${teacherUid}`);

        const userSnap = await userDocRef.get();
        if (!userSnap.exists || userSnap.data().status !== 'pending') {
            throw new HttpsError('failed-precondition', '존재하지 않거나 승인 대기 중이 아닌 사용자입니다.');
        }

        const batch = db.batch();
        const now = FieldValue.serverTimestamp();

        // ✅ 1. users 업데이트 (classId 저장)
        batch.update(userDocRef, {
            status: "approved",
            classId: generatedClassId
        });

        // ✅ 2. classes 문서 생성 (표시용 이름도 포함)
        batch.set(classDocRef, {
            classDocId: requestedClassDocId, // ex. 서룡초 6-3
            teacherUid,
            teacherName,
            currencyUnit: "코인",
            createdAt: now
        });

        // ✅ 3. students 하위 컬렉션에 교사 등록
        batch.set(studentDocRef, {
            uid: teacherUid,
            name: teacherName,
            role: 'teacher',
            studentNumber: 0,
            job: '교사',
            creditScore: 700,
            assets: {
                cash: 10000,
                deposit: 0,
                loan: 0,
                stockValue: { value: 0 }
            },
            createdAt: now
        });

        await batch.commit();

        // ✅ 4. 커스텀 클레임 업데이트
        await authAdmin.setCustomUserClaims(teacherUid, {
            role: 'teacher',
            classId: generatedClassId,
            isApproved: true
        });

        return { success: true, classId: generatedClassId, classDocId: requestedClassDocId };
    } catch (error) {
        console.error("approveTeacher error:", error);
        throw new HttpsError('internal', '교사 승인 중 오류 발생');
    }
});


// 학생 계정 일괄 생성
/**
 * ✅ [호출 가능 함수] 학생 계정을 일괄 생성합니다. (v2 onCall 방식)
 */
exports.createStudentAccounts = onCall(
    {
        region: "asia-northeast3",
        memory: "512MiB",
        timeoutSeconds: 120,
    },
    async (request) => {
        // 1. 인증 확인
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "인증이 필요합니다.");
        }

        const callerUid = request.auth.uid;
        let callerRole, callerClassId;

        try {
            const callerDoc = await db.collection("users").doc(callerUid).get();
            if (!callerDoc.exists) throw new Error("호출자 사용자 문서가 존재하지 않습니다.");
            const callerData = callerDoc.data();
            callerRole = callerData.role;
            if (callerRole === "teacher") {
                callerClassId = callerData.classId || null;
            }
        } catch (error) {
            throw new HttpsError("permission-denied", `사용자 정보 확인 오류: ${error.message}`);
        }

        if (callerRole !== "admin" && callerRole !== "teacher") {
            throw new HttpsError("permission-denied", "이 기능을 사용할 권한이 없습니다.");
        }

        // 2. 요청 데이터 확인
        const { students, classIdToAssign } = request.data;
        if (!Array.isArray(students) || students.length === 0) {
            throw new HttpsError("invalid-argument", "학생 정보가 필요합니다.");
        }

        const finalClassId = callerRole === "teacher" ? callerClassId : classIdToAssign;
        if (!finalClassId) {
            throw new HttpsError("invalid-argument", "학급 ID가 누락되었습니다.");
        }

        // 3. 계정 생성
        const results = [];
        const successfulCreations = [];

        for (const student of students) {
            const { email, password, name, studentNumber } = student;

            if (!email || !password || !name || !studentNumber) {
                results.push({
                    status: "error",
                    email,
                    name,
                    studentNumber,
                    message: "이름, 이메일, 비밀번호, 학번은 필수입니다.",
                });
                continue;
            }

            try {
                const userRecord = await authAdmin.createUser({
                    email,
                    password,
                    displayName: name,
                });

                await authAdmin.setCustomUserClaims(userRecord.uid, {
                    role: "student",
                    isApproved: true,
                    classId: finalClassId,
                });

                successfulCreations.push({
                    uid: userRecord.uid,
                    email,
                    name,
                    studentNumber,
                });

                results.push({
                    status: "success",
                    email,
                    name,
                    studentNumber,
                    uid: userRecord.uid,
                    message: `${name} (${email}) 계정 생성 완료`,
                });
            } catch (error) {
                let msg = "계정 생성 중 알 수 없는 오류";
                if (error.code === "auth/email-already-exists") msg = "이미 사용 중인 이메일입니다.";
                else if (error.code === "auth/invalid-password") msg = "비밀번호는 6자 이상이어야 합니다.";

                results.push({
                    status: "error",
                    email,
                    name,
                    studentNumber,
                    message: msg,
                });
            }
        }

        // 4. Firestore에 저장
        const batch = db.batch();
        for (const student of successfulCreations) {
            const { uid, name, email, studentNumber } = student;

            const studentRef = db
                .collection("classes")
                .doc(finalClassId)
                .collection("students")
                .doc(uid);

            const userRef = db.collection("users").doc(uid);

            const data = {
                name,
                email,
                role: "student",
                studentNumber,
                classId: finalClassId,
                createdAt: new Date(),
            };

            batch.set(studentRef, data);
            batch.set(userRef, data);
        }

        await batch.commit();

        // 5. 결과 반환
        return { results };
    }
);

// ✅ 학생 계정 일괄 삭제 함수
exports.deleteStudentAccounts = onCall(
    {
        region: "asia-northeast3",
        memory: "512MiB",
        timeoutSeconds: 120,
    },
    async (request) => {
        // 🔐 인증 확인
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "인증이 필요합니다.");
        }

        const { studentUids, classId } = request.data;
        if (!Array.isArray(studentUids) || !classId) {
            throw new HttpsError("invalid-argument", "studentUids와 classId는 필수입니다.");
        }

        const results = [];

        for (const uid of studentUids) {
            try {
                // 1. Firebase Auth 사용자 삭제
                await authAdmin.deleteUser(uid);

                // 2. Firestore 문서 삭제
                const userRef = db.doc(`users/${uid}`);
                const classStudentRef = db.doc(`classes/${classId}/students/${uid}`);

                await Promise.all([
                    userRef.delete(),
                    classStudentRef.delete(),
                ]);

                results.push({ uid, status: "success" });
            } catch (error) {
                results.push({ uid, status: "error", message: error.message });
            }
        }

        return { results };
    }
);

// 비밀번호 초기화
exports.resetPasswordHttp = onRequest(
    {
        region: "asia-northeast3",
        memory: "256MiB",
        timeoutSeconds: 60,
        cors: true,
    },
    async (req, res) => {
        if (req.method !== "POST") {
            console.warn("Method Not Allowed for resetPasswordHttp:", req.method, { structuredData: true });
            return res.status(405).send({ error: "Method Not Allowed" });
        }

        const authorizationHeader = req.headers.authorization || "";
        if (!authorizationHeader.startsWith("Bearer ")) {
            console.warn("Unauthorized for resetPasswordHttp: Missing or malformed Bearer token.", {
                structuredData: true,
            });
            return res.status(401).send({ error: "Unauthorized", message: "인증 토큰이 필요합니다." });
        }

        const idToken = authorizationHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await authAdmin.verifyIdToken(idToken);
        } catch (error) {
            console.error("Error verifying ID token for resetPasswordHttp:", error, { structuredData: true });
            return res.status(401).send({ error: "Unauthorized", message: "유효하지 않은 인증 토큰입니다." });
        }

        const callerUid = decodedToken.uid;
        console.info(`Request received from UID: ${callerUid} for resetPasswordHttp`, { structuredData: true });

        const callerDoc = await db.collection("users").doc(callerUid).get();
        if (!callerDoc.exists) {
            const errMsg = "사용자 정보가 없습니다 (호출자 문서 없음).";
            console.error(`Caller document not found for UID: ${callerUid} in resetPasswordHttp.`, {
                messageDetail: errMsg,
                structuredData: true,
            });
            return res.status(403).send({ error: "Forbidden", message: errMsg });
        }

        const callerData = callerDoc.data();
        const callerRole = callerData.role;
        const callerClassId = callerData.classId || callerData.className || null;

        if (callerRole !== "admin" && callerRole !== "teacher") {
            const warnMsg = `Forbidden role access for resetPasswordHttp by UID: ${callerUid}, Role: ${callerRole}`;
            console.warn(warnMsg, { structuredData: true });
            return res.status(403).send({ error: "Forbidden", message: "권한이 없습니다." });
        }

        if (callerRole === "teacher" && !callerClassId) {
            const errorMsg = "교사에게 학급 정보가 없습니다. 비밀번호를 초기화할 수 없습니다.";
            console.error(`Teacher ${callerUid} has no classId for resetPasswordHttp.`, {
                messageDetail: errorMsg,
                structuredData: true,
            });
            return res.status(403).send({ error: "Forbidden", message: errorMsg });
        }

        const { uid: studentUidToReset } = req.body;
        if (!studentUidToReset) {
            console.warn("Bad Request for resetPasswordHttp: Student UID missing.", { structuredData: true });
            return res.status(400).send({ error: "Bad Request", message: "학생 UID가 필요합니다." });
        }

        const studentDocRef = db.collection("users").doc(studentUidToReset);
        const studentDocSnap = await studentDocRef.get();
        if (!studentDocSnap.exists) {
            const errorMsg = `학생 정보를 Firestore에서 찾을 수 없습니다 (UID: ${studentUidToReset}).`;
            console.error(errorMsg, { structuredData: true });
            return res.status(404).send({ error: "Not Found", message: "학생 정보를 찾을 수 없습니다." });
        }

        const studentData = studentDocSnap.data();
        if (callerRole === "teacher") {
            const studentClassId = studentData.classId || studentData.className || null;
            if (studentClassId !== callerClassId) {
                const warnMsg = `Forbidden attempt by teacher ${callerUid} (Class: ${callerClassId}) ` +
                    `to reset password for student ${studentUidToReset} (Class: ${studentClassId}).`;
                console.warn(warnMsg, { structuredData: true });
                return res.status(403).send({ error: "Forbidden", message: "담당 학급의 학생이 아닙니다." });
            }
        }

        try {
            await authAdmin.updateUser(studentUidToReset, { password: "123456" });
            await studentDocRef.update({
                forcePasswordChange: true,
                passwordLastResetBy: callerUid,
                passwordLastResetAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const infoMsg =
                `Password for student ${studentData.email} (UID: ${studentUidToReset}) reset. ` +
                `Force change flag set. By: ${callerUid}.`;
            console.info(infoMsg, { structuredData: true });

            return res.status(200).send({
                message:
                    `${studentData.email} 학생의 비밀번호가 '123456'으로 초기화되었으며, ` +
                    `다음 로그인 시 반드시 비밀번호를 변경해야 합니다.`,
            });
        } catch (error) {
            const errorLogContext =
                `Error resetting password for student ${studentData.email} (UID: ${studentUidToReset}):`;

            console.error(errorLogContext, error, { structuredData: true });
            return res.status(500).send({
                error: "Internal Server Error",
                message: error.message || "비밀번호 초기화 중 오류가 발생했습니다.",
            });
        }
    }
);


function processFmpHistoricalData(historical, timeframe) {
    if (!Array.isArray(historical)) return [];

    const now = new Date();
    let cutoffDate;

    switch (timeframe) {
        case '7d':
            cutoffDate = new Date(now);
            cutoffDate.setDate(now.getDate() - 7);
            break;
        case '1m':
            cutoffDate = new Date(now);
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case '3m':
            cutoffDate = new Date(now);
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
        case '1y':
            cutoffDate = new Date(now);
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return []; // 'all' 같은 불명확한 값은 제외
    }

    return historical
        .filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= cutoffDate && typeof entry.close === 'number';
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => ({
            date: entry.date,
            price: entry.close
        }));
}


// Firebase FMP Proxy Function (v2 HTTP Trigger)
if (!admin.apps.length) {
    admin.initializeApp();
}

exports.fmpProxy = onRequest({
    cors: true,
    region: "asia-northeast3",
    secrets: [fmpApiKeyParam],
}, async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    const endpointType = req.query.endpoint;
    const symbolsParam = req.query.symbols;
    const symbolParam = req.query.symbol;
    const timeframe = req.query.timeframe;
    const resolution = "D"; // 고정

    const db = admin.firestore();
    const QUOTE_CACHE_DURATION_HOURS = 20;
    const CHART_CACHE_DURATION_HOURS = 20;

    const apiKey = fmpApiKeyParam.value();
    if (!apiKey) return res.status(500).send('Server configuration error: API key missing.');
    if (!endpointType) return res.status(400).send('Missing endpoint type parameter.');

    if (endpointType === 'quote') {
        if (!symbolsParam && !symbolParam) {
            return res.status(400).send('Missing symbols or symbol parameter for quote endpoint.');
        }

        const symbols = symbolsParam
            ? symbolsParam.split(',').map(s => s.trim()).filter(Boolean)
            : [symbolParam.trim()].filter(Boolean);

        const results = {};

        await Promise.all(symbols.map(async (symbol) => {
            try {
                const docRef = db.collection("stockMarketCache").doc(symbol);
                const snap = await docRef.get();
                if (snap.exists) {
                    const data = snap.data();
                    const age = (Timestamp.now().seconds - data.lastFetched.seconds) / 3600;
                    if (age < QUOTE_CACHE_DURATION_HOURS) {
                        results[symbol] = {
                            c: data.currentPriceUSD,
                            pc: data.previousCloseUSD,
                            t: data.lastFetched.seconds,
                            source: 'cache'
                        };
                        return;
                    }
                }
            } catch (e) {
                console.error(`[Quote Cache] Read error for ${symbol}:`, e);
            }

            try {
                const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
                const response = await axios.get(url);
                const quote = response.data?.[0];
                if (quote?.price && quote?.previousClose) {
                    const now = Timestamp.now();
                    await db.collection("stockMarketCache").doc(symbol).set({
                        currentPriceUSD: quote.price,
                        previousCloseUSD: quote.previousClose,
                        lastFetched: now
                    }, { merge: true });
                    results[symbol] = {
                        c: quote.price,
                        pc: quote.previousClose,
                        t: Math.floor(quote.timestamp || now.seconds),
                        source: 'live'
                    };
                } else {
                    results[symbol] = { error: `Invalid data for ${symbol}`, source: 'live-error' };
                }
            } catch (e) {
                results[symbol] = { error: e.message, source: 'live-error' };
            }
        }));

        return res.status(200).json(results);

    } else if (endpointType === 'historical-chart') {
        if (!symbolParam || !timeframe) {
            return res.status(400).send('Missing symbol or timeframe parameter for historical-chart endpoint.');
        }

        const VALID_TIMEFRAMES = ['7d', '1m', '3m', '1y'];
        if (!VALID_TIMEFRAMES.includes(timeframe)) {
            return res.status(400).send('Invalid timeframe.');
        }

        const chartCacheKey = `${symbolParam}_${resolution}_fmp`;

        try {
            const docRef = db.collection("stockChartCache").doc(chartCacheKey);
            const snap = await docRef.get();
            if (snap.exists) {
                const data = snap.data();
                const age = (Timestamp.now().seconds - data.lastFetched.seconds) / 3600;
                if (age < CHART_CACHE_DURATION_HOURS && Array.isArray(data.historical) && data.historical.length > 0) {
                    const processed = processFmpHistoricalData(data.historical, timeframe);
                    if (processed.length > 0) {
                        return res.status(200).json({
                            s: 'ok',
                            t: processed.map(d => Math.floor(new Date(d.date).getTime() / 1000)),
                            c: processed.map(d => d.price),
                            source: 'cache'
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`[Chart Cache] Error for ${chartCacheKey}:`, e);
        }

        return res.status(200).json({
            s: 'no_data',
            t: [],
            c: [],
            source: 'no-cache-available'
        });

    } else {
        return res.status(400).send('Unsupported endpoint type.');
    }
});

// 1. 상태 리셋 함수
exports.resetPrefetchStatusDaily = onSchedule(
    {
        schedule: "1 0 * * *", // 매일 00:01 KST 실행
        timeZone: "Asia/Seoul",
        region: "asia-northeast3"
    },
    async (_event) => {
        console.log("[Reset Prefetch Status Daily] 시작");

        try {
            const nowKST = new Date();
            const nyDate = new Date(nowKST.toLocaleString("en-US", { timeZone: "America/New_York" }));

            const nyYear = nyDate.getFullYear();
            const nyMonth = String(nyDate.getMonth() + 1).padStart(2, '0');
            const nyDay = String(nyDate.getDate()).padStart(2, '0');
            const nyDateStr = `${nyYear}-${nyMonth}-${nyDay}`;
            const nyDayOfWeek = nyDate.getDay();

            let runType = "weekday";
            if (nyDayOfWeek === 0 || nyDayOfWeek === 6 || US_STOCK_MARKET_HOLIDAYS.includes(nyDateStr)) {
                runType = "holiday/weekend";
            }

            const quotesStatus = {
                lastProcessedSymbolIndex: -1,
                currentBatchType: "quotes",
                dailyRunCompleted: false,
                lastRunDate: nyDateStr,
                runType
            };

            const chartsStatus = {
                lastProcessedSymbolIndex: -1,
                currentBatchType: runType === "weekday" ? "charts" : "none",
                dailyRunCompleted: false,
                lastRunDate: nyDateStr,
                runType
            };

            await Promise.all([
                db.collection("prefetchControl").doc("status_quotes").set(quotesStatus, { merge: true }),
                db.collection("prefetchControl").doc("status_charts").set(chartsStatus, { merge: true })
            ]);

            console.log(`[Reset Prefetch Status Daily] 완료 - 기준일자(NY): ${nyDateStr}, RunType: ${runType}`);
        } catch (error) {
            console.error("[Reset Prefetch Status Daily] 오류 발생:", error);
        }

        return null;
    }
);

// 2. Quotes 캐시
exports.prefetchQuotesData = onSchedule(
    { schedule: '0 8 * * 1-5', timeZone: 'Asia/Seoul', region: 'asia-northeast3', timeoutSeconds: 540, memory: '512MiB', secrets: [fmpApiKeyParam] },
    async () => {
        const { targetNY } = getPrefetchContext();
        const apiKey = fmpApiKeyParam.value();
        if (!apiKey) return null;

        const statusRef = db.collection('prefetchControl').doc('status_quotes');
        const statusSnap = await statusRef.get();
        const status = statusSnap.exists ? statusSnap.data() : {};

        if (status.currentBatchType !== 'quotes') return null;
        if (status.targetDate !== targetNY) {
            await statusRef.set({ lastProcessedSymbolIndex: -1, dailyRunCompleted: false, targetDate: targetNY }, { merge: true });
        }
        const updatedStatus = (await statusRef.get()).data();
        if (updatedStatus.dailyRunCompleted) return null;

        const symbols = await fetchAllSymbols();
        const batch = db.batch();
        const summary = {};
        let idx = updatedStatus.lastProcessedSymbolIndex + 1;
        let processed = 0;

        while (idx < symbols.length && processed < 25) {
            const symbol = symbols[idx++]; processed++;
            let retries = 0; let success = false;
            while (retries <= 1 && !success) {
                try {
                    const res = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`);
                    const quote = Array.isArray(res.data) ? res.data[0] : null;
                    if (quote) {
                        batch.set(db.collection('stockMarketCache').doc(symbol), { currentPriceUSD: quote.price, previousCloseUSD: quote.previousClose, name: quote.name, lastFetched: Timestamp.now(), source: 'fmp' }, { merge: true });
                        summary[symbol] = { current: quote.price, previousClose: quote.previousClose, name: quote.name, lastFetched: Timestamp.now(), source: 'fmp' };
                    }
                    success = true;
                } catch (e) {
                    retries++;
                    if (e.response?.status === 429 && retries <= 1) await new Promise(r => setTimeout(r, 120000));
                    else success = true;
                }
            }
            if (processed < 25) await new Promise(r => setTimeout(r, 1500));
        }

        if (processed) {
            await batch.commit();
            await db.collection('stockMarketSummary').doc(`quotes_${targetNY}`).set(summary, { merge: true });
        }
        await statusRef.set({ lastProcessedSymbolIndex: idx - 1, dailyRunCompleted: idx >= symbols.length, targetDate: targetNY }, { merge: true });
    }
);

// 3. Charts 캐시
exports.prefetchChartsData = onSchedule(
    { schedule: '10 8 * * 1-5', timeZone: 'Asia/Seoul', region: 'asia-northeast3', timeoutSeconds: 540, memory: '512MiB', secrets: [fmpApiKeyParam] },
    async () => {
        const { targetNY } = getPrefetchContext();
        const apiKey = fmpApiKeyParam.value();
        if (!apiKey) return null;

        const statusRef = db.collection('prefetchControl').doc('status_charts');
        const statusSnap = await statusRef.get();
        const status = statusSnap.exists ? statusSnap.data() : {};

        if (status.currentBatchType !== 'charts') return null;
        if (status.targetDate !== targetNY) {
            await statusRef.set({ lastProcessedSymbolIndex: -1, dailyRunCompleted: false, targetDate: targetNY }, { merge: true });
        }
        const updatedStatus = (await statusRef.get()).data();
        if (updatedStatus.dailyRunCompleted) return null;

        const symbols = await fetchAllSymbols();
        const batch = db.batch();
        let idx = updatedStatus.lastProcessedSymbolIndex + 1;
        let processed = 0;

        while (idx < symbols.length && processed < 25) {
            const symbol = symbols[idx++]; processed++;
            let retries = 0; let success = false;
            while (retries <= 1 && !success) {
                try {
                    const from = dayjs(targetNY).subtract(1, 'year').add(1, 'day').format('YYYY-MM-DD');
                    const res = await axios.get(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${from}&to=${targetNY}&apikey=${apiKey}`);
                    const hist = res.data.historical;
                    if (Array.isArray(hist)) batch.set(db.collection('stockChartCache').doc(`${symbol}_D_fmp`), { historical: hist, lastFetched: Timestamp.now(), source: 'fmp' }, { merge: true });
                    success = true;
                } catch (e) {
                    retries++;
                    if (e.response?.status === 429 && retries <= 1) await new Promise(r => setTimeout(r, 120000));
                    else success = true;
                }
            }
            if (processed < 25) await new Promise(r => setTimeout(r, 1500));
        }

        if (processed) await batch.commit();
        await statusRef.set({ lastProcessedSymbolIndex: idx - 1, dailyRunCompleted: idx >= symbols.length, targetDate: targetNY }, { merge: true });
    }
);

// 4. 요약 재생성
exports.rebuildStockSummaries = onSchedule(
    {
        schedule: '30 8 * * 1-5',
        timeZone: 'Asia/Seoul',
        region: 'asia-northeast3',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async () => {
        console.info('[rebuild] START');
        try {
            // ─── Quote 요약 ───
            const quoteSnap = await db.collection('stockMarketCache').get();
            const quoteSummary = {};
            quoteSnap.forEach(d => {
                const dt = d.data();
                if (dt.currentPriceUSD != null) {
                    quoteSummary[d.id] = {
                        current: dt.currentPriceUSD,
                        previousClose: dt.previousCloseUSD,
                        name: dt.name,
                        lastFetched: dt.lastFetched,
                        source: dt.source,
                    };
                }
            });
            await db.collection('stockMarketSummary').doc('today_quotes_all').set(quoteSummary);
            console.info(`[rebuild] Quotes summary saved. Total symbols: ${Object.keys(quoteSummary).length}`);

            // ─── Chart 요약 ───
            const chartSnap = await db.collection('stockChartCache').get();
            const mapData = {};
            chartSnap.forEach(d => {
                const sym = d.id.replace('_D_fmp', '');
                const dt = d.data();
                if (dt.historical) {
                    const timeframeData = generateTimeframeChartData(dt.historical);
                    console.info(`[rebuild] Chart generated for ${sym}. Keys:`, Object.keys(timeframeData));
                    mapData[sym] = {
                        ...timeframeData,
                        lastFetched: dt.lastFetched,
                        source: dt.source,
                    };
                } else {
                    console.warn(`[rebuild] No historical data for ${sym}`);
                }
            });

            console.info(`[rebuild] Total symbols with chart data: ${Object.keys(mapData).length}`);

            if (!mapData || Object.keys(mapData).length === 0) {
                console.warn('[rebuild] mapData is empty or undefined, skipping chart summary save');
                return null;
            }

            const collectionName = 'stockChartSummary';
            const docIdPrefix = 'today_charts_part';
            console.info(`[rebuild] Calling splitAndSetDoc with collectionName=${collectionName}, docIdPrefix=${docIdPrefix}`);

            await splitAndSetDoc(
                db, // Firestore 인스턴스
                'stockChartSummary',   // 컬렉션 이름 (문자열)
                'today_charts_part',  // 문서 ID 접두사 (문자열)
                mapData,              // 저장할 데이터
                7                    // 한 문서에 저장할 최대 필드 수
            );

            console.info('[rebuild] END');
        } catch (e) {
            console.error('[rebuild] ERROR', e);
            throw e;
        }
        return null;
    }
);

// ★★★ 기업 프로필 정보 수동 일괄 로드 함수 (HTTP 트리거) ★★★
exports.manualPrefetchStockProfiles = onRequest( // 함수 이름 변경 및 onRequest 사용
    {
        region: "asia-northeast3",
        timeoutSeconds: 540, // 모든 심볼을 한 번에 처리하므로 충분한 시간 필요
        memory: "512MiB",
        secrets: [fmpApiKeyParam] // FMP API 키 접근
        // invoker: ["admin", "owner"], // ★ 권장: 특정 권한을 가진 사용자만 호출하도록 설정
        // 또는 ID 토큰을 확인하는 인증 로직 추가
    },
    async (req, res) => { // HTTP 요청(req) 및 응답(res) 객체
        // ★ (선택적이지만 강력 권장) 인증된 관리자만 이 함수를 호출할 수 있도록 보호 로직 추가
        // 예: const idToken = req.headers.authorization?.split("Bearer ")[1];
        //     if (!idToken) { return res.status(401).send("Unauthorized"); }
        //     try {
        //         const decodedToken = await admin.auth().verifyIdToken(idToken);
        //         const callerDoc = await db.collection("users").doc(decodedToken.uid).get();
        //         if (!callerDoc.exists() || callerDoc.data().role !== 'admin') { // 또는 isStockAdmin 등
        //             return res.status(403).send("Forbidden: Not an admin.");
        //         }
        //     } catch (error) { return res.status(401).send("Unauthorized: Invalid token."); }

        console.info("========== [Manual Prefetch Stock Profiles] Function execution STARTED by HTTP request ==========");
        const apiKey = fmpApiKeyParam.value();
        if (!apiKey) {
            console.error("[Manual Prefetch Stock Profiles] CRITICAL: FMP API key not available.");
            return res.status(500).send({ error: "Server configuration error: API key missing." });
        }

        const PROFILE_CACHE_COLLECTION = "stockProfileCache";
        let successCount = 0;
        let errorCount = 0;
        const symbolsAttempted = [];

        try {
            categoriesSnap.forEach(docSnap => {
                const categoryData = docSnap.data();
                if (categoryData.symbols && Array.isArray(categoryData.symbols)) {
                    categoryData.symbols.forEach(s => {
                        if (s && s.ticker) allSymbols.add(s.ticker);
                    });
                }
            });

            if (allSymbols.size === 0) {
                console.info("[Manual Prefetch Stock Profiles] No symbols found in stockCategories.");
                return res.status(200).send({ message: "No symbols found in stockCategories. Nothing to prefetch." });
            }

            const symbolsArray = Array.from(allSymbols);
            console.info(`[Manual Prefetch Stock Profiles] Found ${symbolsArray.length} unique symbols to prefetch profiles for.`);

            const firestoreBatch = db.batch(); // 하나의 배치로 모든 업데이트 시도 (문서 수 제한 주의)
            // 또는 여러 개의 작은 배치로 나누어 커밋
            const API_CALL_DELAY_MS = 300; // FMP API Rate Limit을 피하기 위한 호출 간 최소 지연 (조정 필요)

            for (const symbol of symbolsArray) {
                symbolsAttempted.push(symbol);
                const fmpURL = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
                try {
                    const response = await axios.get(fmpURL);
                    const profileDataArray = response.data;

                    if (response.status === 200 && Array.isArray(profileDataArray) && profileDataArray.length > 0) {
                        const profileData = profileDataArray[0];
                        if (profileData && profileData.symbol) {
                            const cacheDocRef = db.collection(PROFILE_CACHE_COLLECTION).doc(symbol);
                            firestoreBatch.set(cacheDocRef, {
                                data: profileData,
                                lastFetchedTimestamp: Timestamp.now()
                            }, { merge: true });
                            successCount++;
                            console.info(`[Manual Prefetch Stock Profiles] Prepared cache for ${symbol}.`);
                        } else {
                            console.warn(`[Manual Prefetch Stock Profiles] Invalid profile data structure for ${symbol}:`, profileDataArray);
                            errorCount++;
                        }
                    } else if (response.status === 200 && Array.isArray(profileDataArray) && profileDataArray.length === 0) {
                        console.warn(`[Manual Prefetch Stock Profiles] No profile data (empty array) returned for ${symbol}.`);
                        errorCount++; // 혹은 'not found'로 별도 카운트
                    } else {
                        console.warn(`[Manual Prefetch Stock Profiles] Failed to fetch profile for ${symbol}. Status: ${response.status}, Data:`, response.data);
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`[Manual Prefetch Stock Profiles] Error fetching FMP profile for ${symbol}:`, error.message);
                    errorCount++;
                    if (error.response && error.response.status === 429) { // Rate limit
                        console.warn(`[Manual Prefetch Stock Profiles] Rate limit possibly hit for ${symbol}. Waiting before next call.`);
                        await new Promise(resolve => setTimeout(resolve, 5000)); // 잠시 대기
                    }
                }
                // 각 API 호출 사이에 작은 지연 추가
                if (symbolsArray.indexOf(symbol) < symbolsArray.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
                }
            }

            if (successCount > 0) { // 성공적으로 가져온 데이터가 있을 때만 배치 커밋
                await firestoreBatch.commit();
                console.info(`[Manual Prefetch Stock Profiles] Firestore batch committed. ${successCount} profiles cached/updated.`);
            }

            const summaryMessage = `Profile prefetch finished. Attempted: ${symbolsArray.length}, Successfully cached: ${successCount}, Errors/Not Found: ${errorCount}.`;
            console.info(summaryMessage);
            return res.status(200).send({ message: summaryMessage, successCount, errorCount });

        } catch (error) {
            console.error("[Manual Prefetch Stock Profiles] CRITICAL OVERALL ERROR:", error);
            return res.status(500).send({ error: "Overall error during profile prefetch: " + error.message });
        } finally {
            console.info("========== [Manual Prefetch Stock Profiles] Function execution FINISHED ==========");
        }
    }
);

/**
 * Firestore에서 'stockMarketSummary/today_quotes' 문서를 읽어
 * 플랫한 형태의 일일 시세 맵을 반환합니다. (서버용, 데이터 타입 처리 강화)
 * @returns {Promise<object>} 일일 시세 맵 (예: { "AAPL": 170.50, ... })
 */
async function fetchDailyPricesAdmin() {
    const pricesMap = {};
    try {
        const summaryRef = db.doc('stockMarketSummary/today_quotes');
        const summarySnap = await summaryRef.get();

        if (summarySnap.exists) {
            const summaryDocData = summarySnap.data() || {};
            for (const symbol in summaryDocData) {
                const priceData = summaryDocData[symbol];
                if (priceData && priceData.current !== undefined) {
                    // ⭐ 수정된 부분: priceData.current 값을 숫자로 변환 시도
                    const priceValue = parseFloat(priceData.current);
                    // 변환된 숫자가 유효한 숫자인지(Not-a-Number가 아닌지) 확인
                    if (!isNaN(priceValue)) {
                        pricesMap[symbol.toUpperCase()] = priceValue;
                    }
                }
            }
        } else {
            console.warn('⚠️ [fetchDailyPricesAdmin] stockMarketSummary/today_quotes 문서가 없습니다.');
        }
    } catch (error) {
        console.error('❌ [fetchDailyPricesAdmin] 일일 시세 정보 가져오는 중 오류:', error);
    }
    // 디버깅을 위해 최종 생성된 pricesMap을 로그로 남김
    console.log('[fetchDailyPricesAdmin] Fetched pricesMap:', pricesMap);
    return pricesMap;
}

/**
 * 특정 학급의 환율 정보를 가져옵니다. (서버용, 수정 완료)
 * @param {string} classId - 학급 ID
 * @returns {Promise<number>} 환율 (기본값 1)
 */
async function fetchClassConversionRateAdmin(classId) {
    try {
        if (!classId) {
            console.warn('[fetchClassConversionRateAdmin] classId가 제공되지 않았습니다. 기본 환율 1을 사용합니다.');
            return 1;
        }
        // 학급 설정 문서 경로 (실제 프로젝트 경로에 맞게 확인/수정 필요)
        const classConfigRef = db.doc(`classes/${classId}/config/stockMarket`);
        const classConfigSnap = await classConfigRef.get();

        // .exists() -> .exists 속성으로 수정
        if (classConfigSnap.exists) {
            return classConfigSnap.data()?.conversionRate || 1;
        }
        console.warn(`⚠️ [fetchClassConversionRateAdmin] 학급 설정 문서(ID: ${classId})가 없거나 conversionRate 필드가 없습니다.`);
    } catch (error) {
        console.error(`❌ [fetchClassConversionRateAdmin] 학급 환율 정보 가져오는 중 오류 (ID: ${classId}):`, error);
    }
    return 1; // 오류 또는 데이터 없음 시 기본값
}

/**
 * 학생의 stockPortfolio 를 읽어서 assets.stockValue 를 객체 형태로 업데이트합니다. (서버용)
 * @param {string} classId
 * @param {string} userId
 * @param {object} currentPricesMap - { "SYMBOL": price } 형태의 시세 맵
 * @param {number} conversionRate
 * @returns {Promise<boolean>} 성공 여부
 */
async function updateStudentStockValueInFirestore(classId, userId, currentPricesMap, conversionRate) {
    // ⭐ Firestore 참조 경로를 다시 한번 명확히 합니다.
    const studentRef = db.doc(`classes/${classId}/students/${userId}`);
    const portfolioRef = db.collection('classes').doc(classId).collection('students').doc(userId).collection('stockPortfolio');

    // 디버깅: 생성된 경로가 올바른지 확인
    console.log(`[updateStudentStockValueInFirestore] studentRef path: ${studentRef.path}`);
    console.log(`[updateStudentStockValueInFirestore] portfolioRef path: ${portfolioRef.path}`);

    try {
        const portfolioSnap = await portfolioRef.get();
        let totalValueUSD = 0;

        console.log(`[updateStudentStockValueInFirestore] Portfolio size: ${portfolioSnap.size}`);

        if (portfolioSnap.empty) {
            console.warn(`[updateStudentStockValueInFirestore] Student's portfolio is empty.`);
        } else {
            console.log(`[updateStudentStockValueInFirestore] Looping through portfolio documents...`);
        }

        portfolioSnap.docs.forEach(docSnap => {
            const stockData = docSnap.data();
            console.log(`[updateStudentStockValueInFirestore] Doc ID: ${docSnap.id}, Data:`, stockData);

            const symbol = stockData.symbol?.toUpperCase();
            if (symbol && currentPricesMap[symbol] !== undefined) {
                const priceUSD = currentPricesMap[symbol];
                const quantity = Number(stockData.quantity);
                if (!isNaN(quantity) && quantity > 0 && priceUSD > 0) {
                    totalValueUSD += quantity * priceUSD;
                    console.log(`[updateStudentStockValueInFirestore] Added to total: ${quantity} * ${priceUSD}. Current totalValueUSD: ${totalValueUSD}`);
                }
            } else {
                console.warn(`[updateStudentStockValueInFirestore] No price found for symbol: ${symbol} in pricesMap.`);
            }
        });

        console.log(`[updateStudentStockValueInFirestore] Final totalValueUSD before rounding: ${totalValueUSD}`);
        const valueInClassCurrency = Math.round(totalValueUSD * conversionRate);

        const stockValueData = {
            value: valueInClassCurrency,
            rawValueUSD: parseFloat(totalValueUSD.toFixed(2)),
            lastCalculated: admin.firestore.FieldValue.serverTimestamp()
        };

        console.log(`[updateStudentStockValueInFirestore] Preparing to update Firestore with:`, stockValueData);
        await studentRef.update({
            'assets.stockValue': stockValueData
        });
        console.log(`✅ Successfully updated stockValue for student ${userId}.`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to update stockValue for student ${userId}:`, error);
        return false;
    }
}

// Firestore v2 트리거: classes/{classId}/students/{userId}/tradeHistory/{tradeId} 경로에 새 문서 생성 시
exports.onTransactionCreateUpdatePortfolioValue = onDocumentCreated(
    {
        document: 'classes/{classId}/students/{userId}/tradeHistory/{tradeId}',
        region: 'asia-northeast3',
    },
    async (event) => {
        const snap = event.data;
        if (!snap) { return; }

        const tradeData = snap.data();
        const tradeId = event.params.tradeId;

        // ⭐ 핵심: 문서 내부의 정확한 ID 값을 사용합니다.
        const correctClassId = tradeData.classId;
        const correctUserId = tradeData.userId || tradeData.actorUid; // userId 또는 actorUid 필드 사용

        // 필드가 없는 경우를 대비한 방어 코드
        if (!correctClassId || !correctUserId) {
            console.error(`Missing classId or userId field inside tradeHistory document [${tradeId}]`);
            return;
        }

        console.log(`Trade Record [${tradeId}] created for student ${correctUserId} in class ${correctClassId}. Type: ${tradeData.type}`);

        if (tradeData.type.startsWith('STOCK_BUY') || tradeData.type.startsWith('STOCK_SELL')) {
            console.log(`Transaction type [${tradeData.type}] requires portfolio value update. Proceeding...`);

            // ⭐ 올바른 ID를 사용하여 헬퍼 함수 호출
            const dailyPricesMap = await fetchDailyPricesAdmin();
            const conversionRate = await fetchClassConversionRateAdmin(correctClassId);
            await updateStudentStockValueInFirestore(correctClassId, correctUserId, dailyPricesMap, conversionRate);
        } else {
            console.log(`Transaction type [${tradeData.type}] does not require portfolio value update.`);
        }
        return;
    }
);

// 👉 학생 UID 목록 가져오기
async function getStudentUids(classId) {
    const studentsRef = collection(db, `classes/${classId}/students`);
    const snapshot = await getDocs(studentsRef);
    return snapshot.docs.map(doc => doc.id);
}

// 👉 급여세 변동분 계산
async function calculateSalaryTax(classId, studentUids, sinceTimestamp) {
    let totalSalaryTaxDelta = 0;
    for (const uid of studentUids) {
        let q = query(collection(db, `classes/${classId}/students/${uid}/paySlips`));
        if (sinceTimestamp) {
            q = query(q, where('generatedAt', '>', sinceTimestamp));
        }
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
            const deductions = docSnap.data().deductions || [];
            deductions.forEach(deduction => {
                totalSalaryTaxDelta += Number(deduction.amount) || 0;
            });
        });
    }
    return totalSalaryTaxDelta;
}

// 👉 수동 납부 세금 변동분 계산
async function calculateManualTaxPaid(classId, sinceTimestamp) {
    let manualTaxPaidDelta = 0;
    let q = query(collectionGroup(db, 'taxBills'), where('classId', '==', classId), where('isPaid', '==', true));
    if (sinceTimestamp) {
        q = query(q, where('paidAt', '>', sinceTimestamp));
    }
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        manualTaxPaidDelta += docSnap.data().amountPaid || 0;
    });
    return manualTaxPaidDelta;
}

// 👉 주식/환전 수수료 변동분 계산
async function calculateClassStockExchangeFee(classId, sinceTimestamp) {
    let totalFeeDelta = 0;
    let q = query(collectionGroup(db, 'tradeHistory'), where('classId', '==', classId), where('feeInClassCurrency', '>', 0));
    if (sinceTimestamp) {
        q = query(q, where('timestamp', '>', sinceTimestamp));
    }
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        totalFeeDelta += docSnap.data().feeInClassCurrency || 0;
    });
    return totalFeeDelta;
}

// 👉 세금 지출 변동분 계산
async function calculateTaxExpense(classId, sinceTimestamp) {
    let expenseDelta = 0;
    let q = query(collection(db, `classes/${classId}/taxUsageHistory`));
    if (sinceTimestamp) {
        q = query(q, where('usedAt', '>', sinceTimestamp)); // 'usedAt' 필드명 확인 필요
    }
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        expenseDelta += docSnap.data().amountUsed || 0;
    });
    return expenseDelta;
}


// =================================================================
// Cloud Function 등록 섹션 (두 개로 분리)
// =================================================================

/**
 * ✅ [호출 가능 함수] 세금 '수입' 항목들을 증분 계산하여 업데이트합니다.
 */
exports.updateTaxIncomeSummaryCallable = onCall(
    { region: 'asia-northeast3', timeoutSeconds: 300, memory: '512MiB' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', '이 기능을 사용하려면 로그인이 필요합니다.');
        }
        const classId = request.data.classId;
        if (!classId) {
            throw new HttpsError('invalid-argument', '요청에 학급 ID가 포함되어야 합니다.');
        }

        // TODO: 요청자가 교사인지 권한 확인 로직 추가

        try {
            console.log(`🚀 [${classId}] 세금 '수입' Summary 업데이트 시작...`);
            const summaryDocRef = doc(db, `classes/${classId}/dashboardSummary/taxSummary`);
            const summarySnap = await getDoc(summaryDocRef);

            const lastUpdatedAt = summarySnap.exists ? summarySnap.data().incomeLastUpdatedAt : null;
            const currentSummary = summarySnap.exists ? summarySnap.data() : {};

            const studentUids = await getStudentUids(classId);
            const [
                salaryTax_delta,
                manualTaxPaid_delta,
                stockExchangeFee_delta
            ] = await Promise.all([
                calculateSalaryTax(classId, studentUids, lastUpdatedAt),
                calculateManualTaxPaid(classId, lastUpdatedAt),
                calculateClassStockExchangeFee(classId, lastUpdatedAt)
            ]);

            const newSalaryTax = (currentSummary.salaryTax || 0) + salaryTax_delta;
            const newManualTaxPaid = (currentSummary.manualTaxPaid || 0) + manualTaxPaid_delta;
            const newStockExchangeFee = (currentSummary.stockExchangeFee || 0) + stockExchangeFee_delta;
            const newTotalIncome = newSalaryTax + newManualTaxPaid + newStockExchangeFee;

            await setDoc(summaryDocRef, {
                totalIncome: newTotalIncome,
                salaryTax: newSalaryTax,
                manualTaxPaid: newManualTaxPaid,
                stockExchangeFee: newStockExchangeFee,
                incomeLastUpdatedAt: serverTimestamp() // 수입 마지막 업데이트 시각 기록
            }, { merge: true }); // merge: true로 다른 필드(expense 등)는 덮어쓰지 않음

            console.log(`✅ [${classId}] 세금 수입 현황 업데이트 완료!`);
            return { success: true, message: '세금 수입 현황이 성공적으로 업데이트되었습니다.' };

        } catch (error) {
            console.error(`❌ [${classId}] 세금 수입 업데이트 실패:`, error);
            throw new HttpsError('internal', '세금 수입 현황 업데이트 중 서버 오류가 발생했습니다.');
        }
    }
);

/**
 * ✅ [호출 가능 함수] 세금 '지출' 항목들을 증분 계산하여 업데이트합니다.
 */
exports.updateTaxExpenseSummaryCallable = onCall(
    { region: 'asia-northeast3', timeoutSeconds: 300, memory: '512MiB' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', '이 기능을 사용하려면 로그인이 필요합니다.');
        }
        const classId = request.data.classId;
        if (!classId) {
            throw new HttpsError('invalid-argument', '학급 ID가 포함되어야 합니다.');
        }

        // TODO: 요청자가 교사인지 권한 확인 로직 추가

        try {
            console.log(`🚀 [${classId}] 세금 '지출' Summary 업데이트 시작...`);
            const summaryDocRef = doc(db, `classes/${classId}/dashboardSummary/taxSummary`);
            const summarySnap = await getDoc(summaryDocRef);

            const lastUpdatedAt = summarySnap.exists ? summarySnap.data().expenseLastUpdatedAt : null;
            const currentSummary = summarySnap.exists ? summarySnap.data() : {};

            const expense_delta = await calculateTaxExpense(classId, lastUpdatedAt);
            const newTotalExpense = (currentSummary.totalExpense || 0) + expense_delta;

            await setDoc(summaryDocRef, {
                totalExpense: newTotalExpense,
                expenseLastUpdatedAt: serverTimestamp() // 지출 마지막 업데이트 시각 기록
            }, { merge: true }); // merge: true로 다른 필드(income 등)는 덮어쓰지 않음

            console.log(`✅ [${classId}] 세금 지출 현황 업데이트 완료!`);
            return { success: true, message: '세금 지출 현황이 성공적으로 업데이트되었습니다.' };

        } catch (error) {
            console.error(`❌ [${classId}] 세금 지출 업데이트 실패:`, error);
            throw new HttpsError('internal', '세금 지출 현황 업데이트 중 서버 오류가 발생했습니다.');
        }
    }
);

/**
 * ✅ [Firestore 트리거] 새로운 기부 내역 생성 시, donationSummary 문서를 실시간으로 업데이트합니다.
 * (인원수 계산 로직 제거, 저장 경로 수정)
 */
exports.onDonationCreateUpdateSummary = onDocumentCreated(
    "classes/{classId}/donations/{donationId}",
    async (event) => {
        const snap = event.data;
        if (!snap) {
            console.warn("No data associated with the event for onCreate trigger.");
            return;
        }

        const newDonation = snap.data();
        const amount = newDonation.amount || 0;

        // ⭐⭐⭐ document에서 classId 안전하게 가져오기!
        const classId = newDonation.classId;

        // ⭐ 저장 경로: summary -> donationSummary
        const summaryDocRef = db.doc(`classes/${classId}/dashboardSummary/donationSummary`);

        console.log("[" + classId + "]", "새로운 기부 발생:", amount, "donationSummary 업데이트 시작...");

        try {
            // Firestore 트랜잭션으로 안정적 업데이트
            await db.runTransaction(async (transaction) => {
                const summaryDoc = await transaction.get(summaryDocRef);

                if (!summaryDoc.exists) {
                    // 문서 없으면 새로 생성
                    transaction.set(summaryDocRef, {
                        totalAmount: amount,
                        lastUpdatedAt: FieldValue.serverTimestamp()
                    });
                } else {
                    // 문서 있으면 기존 값에 더하기
                    transaction.update(summaryDocRef, {
                        totalAmount: FieldValue.increment(amount),
                        lastUpdatedAt: FieldValue.serverTimestamp()
                    });
                }
            });

            console.log("[" + classId + "]", "donationSummary 업데이트 성공!");
            return true;

        } catch (error) {
            console.error("[onDonationCreateUpdateSummary] 업데이트 실패:", error);
            return false;
        }
    }
);

// 투표 찬성 반대 처리
exports.castVote = onCall({ region: "asia-northeast3", cors: true }, async (request) => {
    const { classId, billId, choice } = request.data;
    const uid = request.auth?.uid;
    const callerRole = request.auth?.token.role;

    if (!uid) {
        throw new HttpsError("unauthenticated", "투표하려면 로그인이 필요합니다.");
    }
    if (!classId || !billId || !['agree', 'disagree'].includes(choice)) {
        throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
    }

    const billRef = db.doc(`classes/${classId}/assemblyBills/${billId}`);
    const voterRef = db.doc(`classes/${classId}/assemblyBills/${billId}/voters/${uid}`);

    return db.runTransaction(async (transaction) => {
        const billDoc = await transaction.get(billRef);

        if (!billDoc.exists || billDoc.data().status !== 'voting') {
            throw new HttpsError("failed-precondition", "투표가 진행 중인 법안이 아닙니다.");
        }

        // ⭐ 1. 역할에 따라 다른 로직을 실행합니다.
        if (callerRole === 'teacher' || callerRole === 'admin') {
            // --- 교사 또는 관리자인 경우: 횟수 제한 없이 투표 가능 ---
            // 득표수를 무조건 1 증가시킵니다.
            const voteUpdate = {};
            voteUpdate[`votes.${choice}`] = FieldValue.increment(1);
            transaction.update(billRef, voteUpdate);

            // 투표 기록을 남기되, 중복을 체크하지 않고 항상 최신 선택으로 덮어씁니다.
            // 이는 교사의 마지막 투표 행동을 기록하는 용도입니다.
            transaction.set(voterRef, {
                vote: choice,
                votedAt: FieldValue.serverTimestamp(),
                voterUid: uid
            });

        } else {
            // --- 학생인 경우: 한 번만 투표 가능 ---
            const voterDoc = await transaction.get(voterRef);
            if (voterDoc.exists) {
                throw new HttpsError("already-exists", "이미 이 법안에 투표했습니다.");
            }
            // 투표자 문서 생성
            transaction.set(voterRef, {
                vote: choice,
                votedAt: FieldValue.serverTimestamp(),
                voterUid: uid
            });

            // 득표수 업데이트
            const voteUpdate = {};
            voteUpdate[`votes.${choice}`] = FieldValue.increment(1);
            transaction.update(billRef, voteUpdate);
        }

        return { success: true, message: "투표가 완료되었습니다." };
    });
});

// 투표 종료
exports.closeVoting = onCall({ region: "asia-northeast3", cors: true }, async (request) => {
    const { classId, billId } = request.data;
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 🔐 권한 확인 생략 시 아래에서 추가 가능
    // 예: checkUserPermission(callerUid, classId)

    return db.runTransaction(async (transaction) => {
        const classRef = db.doc(`classes/${classId}`);
        const billRef = db.doc(`classes/${classId}/assemblyBills/${billId}`);
        const criteriaRef = db.doc(`classes/${classId}/assemblySettings/criteria`);

        const [classDoc, billDoc, criteriaDoc] = await transaction.getAll(classRef, billRef, criteriaRef);

        if (!billDoc.exists) {
            throw new HttpsError("not-found", "해당 법안을 찾을 수 없습니다.");
        }

        const billData = billDoc.data();

        if (billData.status !== 'voting') {
            throw new HttpsError("failed-precondition", "진행 중인 법안만 종료할 수 있습니다.");
        }

        // ✅ 찬성 수
        const agreeCount = billData.votes?.agree || 0;

        // ✅ 기준 가져오기
        let passThreshold = 18; // 기본값
        if (criteriaDoc.exists && typeof criteriaDoc.data().passThreshold === 'number') {
            passThreshold = criteriaDoc.data().passThreshold;
        } else if (classDoc.exists && typeof classDoc.data().studentCount === 'number') {
            passThreshold = Math.ceil(classDoc.data().studentCount / 2);
        }

        // ✅ 판정
        const finalStatus = agreeCount >= passThreshold ? 'passed' : 'rejected';

        // ✅ 상태 업데이트
        transaction.update(billRef, {
            status: finalStatus,
            closedAt: FieldValue.serverTimestamp()
        });

        return { success: true, finalStatus };
    });
});

// 법안 경찰청 등록
exports.applyAssemblyPolicy = onCall(async (data, context) => {
    const { classId, billId } = data;
    const db = getFirestore();

    // 필수 파라미터 체크
    if (!classId || !billId) {
        throw new HttpsError('invalid-argument', 'classId 또는 billId가 누락되었습니다.');
    }

    // 법안 가져오기
    const billRef = doc(db, `classes/${classId}/assemblyBills/${billId}`);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) {
        throw new HttpsError('not-found', '해당 법안을 찾을 수 없습니다.');
    }

    const bill = billSnap.data();

    // 가결 여부 확인
    if (bill.status !== 'passed') {
        throw new HttpsError('failed-precondition', '가결된 법안만 적용할 수 있습니다.');
    }

    // 중복 적용 방지
    if (bill.isPolicyApplied) {
        return { message: '이미 정책이 적용된 상태입니다.' };
    }

    // 경찰 규칙 데이터 유효성 검사
    if (!bill.policeRuleData || typeof bill.policeRuleData !== 'object') {
        throw new HttpsError('invalid-argument', '유효한 policeRuleData가 없습니다.');
    }

    // ruleId 생성 및 문서 참조
    const ruleId = bill.policeRuleData.ruleId || billId;
    const ruleRef = doc(db, `classes/${classId}/policeRules/${ruleId}`);

    // 중복된 규칙 방지
    const existingRule = await getDoc(ruleRef);
    if (existingRule.exists()) {
        throw new HttpsError('already-exists', '동일한 규칙 ID가 이미 존재합니다.');
    }

    // 규칙 등록
    await setDoc(ruleRef, {
        ...bill.policeRuleData,
        createdBy: bill.proposerName || '무명 제안자',
        createdAt: serverTimestamp(),
        sourceBillId: billId,
    });

    // 법안에 적용 플래그 표시
    await updateDoc(billRef, { isPolicyApplied: true });

    return { message: '정책이 성공적으로 반영되었습니다.' };
});

// ✅ 도전과제 승인 함수
exports.approveMission = onCall(async (request) => {
    const uid = request.auth?.uid;
    const role = request.auth?.token?.role;
    const { classId, missionId, studentUid } = request.data;

    if (!uid || !classId || !missionId || !studentUid) {
        throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
    }

    // ✅ 권한 검사 (하이브리드 방식)
    if (role !== "admin" && role !== "teacher") {
        const allowed = await hasPermission(uid, classId, "mission_admin");
        if (!allowed) {
            throw new HttpsError("permission-denied", "미션 승인 권한이 없습니다.");
        }
    }

    const missionRef = db.doc(`classes/${classId}/missions/${missionId}`);
    const studentRef = db.doc(`classes/${classId}/students/${studentUid}`);

    let missionTitle = "";
    let rewards = {};

    await db.runTransaction(async (transaction) => {
        const missionDoc = await transaction.get(missionRef);
        if (!missionDoc.exists) {
            throw new HttpsError("not-found", "도전과제를 찾을 수 없습니다.");
        }

        const mission = missionDoc.data();
        missionTitle = mission.title || "도전과제";
        rewards = mission.rewards || {};

        const completion = mission.completions?.[studentUid];
        if (!completion) {
            throw new HttpsError("not-found", "제출 기록이 없습니다.");
        }
        if (completion.status !== "pending") {
            throw new HttpsError("failed-precondition", "이미 승인되었거나 취소된 제출입니다.");
        }

        transaction.update(missionRef, {
            [`completions.${studentUid}.status`]: "approved",
            [`completions.${studentUid}.approvedAt`]: FieldValue.serverTimestamp(),
            [`completions.${studentUid}.approverUid`]: uid,
        });

        const updates = {};
        if (rewards.currency && rewards.currency > 0) {
            updates["assets.cash"] = FieldValue.increment(rewards.currency);
        }
        if (rewards.credit && rewards.credit > 0) {
            updates["creditScore"] = FieldValue.increment(rewards.credit);
        }

        if (Object.keys(updates).length > 0) {
            transaction.update(studentRef, updates);
        }
    });

    if (rewards.credit && rewards.credit > 0) {
        const logRef = db.collection(`classes/${classId}/students/${studentUid}/creditLogs`);
        await logRef.add({
            amount: rewards.credit,
            reason: `[미션] ${missionTitle} 성공`,
            source: "mission_reward",
            relatedDocId: missionId,
            actorUid: uid,
            timestamp: FieldValue.serverTimestamp(),
        });
    }

    return { success: true, message: "과제 제출이 승인되고 보상이 지급되었습니다." };
});

// ✅ 도전과제 승인 취소 함수
exports.cancelMissionApproval = onCall(async (request) => {
    const uid = request.auth?.uid;
    const role = request.auth?.token?.role;
    const { classId, missionId, studentUid } = request.data;

    if (!uid || !classId || !missionId || !studentUid) {
        throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
    }

    // ✅ 권한 검사 (하이브리드 방식)
    if (role !== "admin" && role !== "teacher") {
        const allowed = await hasPermission(uid, classId, "mission_admin");
        if (!allowed) {
            throw new HttpsError("permission-denied", "승인 취소 권한이 없습니다.");
        }
    }

    const missionRef = db.doc(`classes/${classId}/missions/${missionId}`);
    const studentRef = db.doc(`classes/${classId}/students/${studentUid}`);

    let missionTitle = "";
    let rewards = {};

    await db.runTransaction(async (transaction) => {
        const missionDoc = await transaction.get(missionRef);
        if (!missionDoc.exists) {
            throw new HttpsError("not-found", "도전과제를 찾을 수 없습니다.");
        }

        const mission = missionDoc.data();
        missionTitle = mission.title || "도전과제";
        rewards = mission.rewards || {};

        const completion = mission.completions?.[studentUid];
        if (!completion) {
            throw new HttpsError("not-found", "제출 기록이 없습니다.");
        }
        if (completion.status !== "approved") {
            throw new HttpsError("failed-precondition", "이미 승인되지 않은 제출입니다.");
        }

        transaction.update(missionRef, {
            [`completions.${studentUid}.status`]: "cancelled",
            [`completions.${studentUid}.cancelledAt`]: FieldValue.serverTimestamp(),
            [`completions.${studentUid}.cancellerUid`]: uid,
        });

        const updates = {};
        if (rewards.currency && rewards.currency > 0) {
            updates["assets.cash"] = FieldValue.increment(-rewards.currency);
        }
        if (rewards.credit && rewards.credit > 0) {
            updates["creditScore"] = FieldValue.increment(-rewards.credit);
        }

        if (Object.keys(updates).length > 0) {
            transaction.update(studentRef, updates);
        }
    });

    if (rewards.credit && rewards.credit > 0) {
        const logRef = db.collection(`classes/${classId}/students/${studentUid}/creditLogs`);
        await logRef.add({
            amount: -rewards.credit,
            reason: `[미션] ${missionTitle} 승인 취소`,
            source: "mission_cancel",
            relatedDocId: missionId,
            actorUid: uid,
            timestamp: FieldValue.serverTimestamp(),
        });
    }

    return { success: true, message: "승인 취소 및 보상이 회수되었습니다." };
});

/**
 * [v2] 도전과제 자동 승인 처리 (학생 호출용)
 * - 시간 검사, 유효성 검사 후 트랜잭션을 통해 안전하게 완료 처리 및 보상 지급
 */
exports.processAutoApproveMission = onCall({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "이 작업을 수행하려면 로그인이 필요합니다.");
    }

    const { classId, missionId } = request.data;
    if (!classId || !missionId) {
        throw new HttpsError("invalid-argument", "classId와 missionId는 필수입니다.");
    }

    const studentUid = request.auth.uid;
    const db = getFirestore();

    try {
        const result = await db.runTransaction(async (transaction) => {
            const missionRef = db.collection("classes").doc(classId).collection("missions").doc(missionId);
            const studentRef = db.collection("classes").doc(classId).collection("students").doc(studentUid);

            const [missionDoc, studentDoc] = await transaction.getAll(missionRef, studentRef);

            if (!missionDoc.exists) throw new HttpsError("not-found", "존재하지 않는 도전과제입니다.");
            if (!studentDoc.exists) throw new HttpsError("not-found", "학생 정보를 찾을 수 없습니다.");

            const mission = missionDoc.data();
            const student = studentDoc.data();

            if (!mission.autoApprove) throw new HttpsError("permission-denied", "이 과제는 자동 승인 대상이 아닙니다.");
            if (mission.completions && mission.completions[studentUid]) throw new HttpsError("already-exists", "이미 제출한 도전과제입니다.");
            if (mission.targetStudentUids && !mission.targetStudentUids.includes(studentUid)) throw new HttpsError("permission-denied", "이 과제의 대상이 아닙니다.");

            const now = new Date();
            const start = mission.startDate?.toDate?.();
            const end = mission.endDate?.toDate?.();
            if (!((!start || now >= start) && (!end || now <= end))) throw new HttpsError("failed-precondition", "제출 가능한 기간이 아닙니다.");
            if (mission.repeatSchedule && Object.keys(mission.repeatSchedule).length > 0) {
                const dayKor = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
                const todaySchedule = mission.repeatSchedule[dayKor];
                if (!todaySchedule) throw new HttpsError("failed-precondition", "오늘은 제출 가능한 요일이 아닙니다.");
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = todaySchedule.start.split(":").map(Number);
                const [endH, endM] = todaySchedule.end.split(":").map(Number);
                if (!(nowMin >= (startH * 60 + startM) && nowMin <= (endH * 60 + endM))) throw new HttpsError("failed-precondition", "지금은 제출 가능한 시간이 아닙니다.");
            }

            // --- 데이터 업데이트 준비 ---
            const serverTime = FieldValue.serverTimestamp();
            const missionUpdate = {
                [`completions.${studentUid}`]: {
                    name: student.name || "학생",
                    studentNumber: student.studentNumber ?? null,
                    status: "approved",
                    submittedAt: serverTime,
                    approvedAt: serverTime,
                    approverUid: studentUid,
                }
            };

            const creditReward = mission.rewards?.credit || 0;
            const currencyReward = mission.rewards?.currency || 0;

            const studentUpdate = {};
            if (currencyReward > 0) {
                studentUpdate["assets.cash"] = FieldValue.increment(currencyReward);
            }
            if (creditReward > 0) {
                studentUpdate["creditScore"] = FieldValue.increment(creditReward);
            }

            // --- 트랜잭션 실행 ---
            transaction.update(missionRef, missionUpdate);
            if (Object.keys(studentUpdate).length > 0) {
                transaction.update(studentRef, studentUpdate);
            }

            if (creditReward > 0) {
                const logRef = db.collection("classes").doc(classId).collection("students").doc(studentUid).collection("creditLogs").doc();
                const logData = {
                    studentUid: studentUid,
                    actorUid: studentUid,
                    amount: creditReward,
                    reason: `도전과제 완료: ${mission.title || '(제목 없음)'}`,
                    source: 'mission_reward',
                    timestamp: serverTime,
                    relatedDocId: missionId,
                };
                transaction.set(logRef, logData);
            }

            return { success: true, message: "도전과제가 자동 승인되고 보상이 지급되었습니다." };
        });
        return result;
    } catch (error) {
        console.error("Error in processAutoApproveMission (v2):", error);
        if (error instanceof HttpsError) throw error;
        else throw new HttpsError("internal", "자동 승인 처리 중 서버 오류가 발생했습니다.");
    }
});
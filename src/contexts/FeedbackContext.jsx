// src/contexts/FeedbackContext.jsx

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({ children }) => {
    const location = useLocation();

    // ✅ 페이지 이동 시 기존 toast 안전하게 정리
    useEffect(() => {
        toast.dismiss();           // 현재 떠 있는 토스트 닫기
        toast.clearWaitingQueue(); // 대기 중인 토스트 제거
    }, [location.pathname]);

    const showFeedback = useCallback((message, variant = 'info', options = {}) => {
        const commonOptions = {
            position: "top-right",
            autoClose: 2500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
            ...options
        };

        switch (variant) {
            case 'success':
                toast.success(message, commonOptions);
                break;
            case 'error':
                toast.error(message, commonOptions);
                break;
            case 'warning':
                toast.warn(message, commonOptions);
                break;
            case 'info':
            default:
                toast.info(message, commonOptions);
                break;
        }
    }, []);

    return (
        <FeedbackContext.Provider value={{ showFeedback }}>
            {children}
            <ToastContainer limit={3} newestOnTop />
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
};

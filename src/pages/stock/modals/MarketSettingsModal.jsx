import React, { useState, useEffect } from 'react';
import { Modal, Button, InputField } from '../../../components/ui';
import { SlidersHorizontal } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';

const MarketSettingsModal = ({
    isOpen,
    onClose,
    currentSettings,
    onSubmitSettings,
    isSubmitting
}) => {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    const [conversionRateInput, setConversionRateInput] = useState('');
    const [tradeFeeRateInput, setTradeFeeRateInput] = useState('');
    const [exchangeFeeRateInput, setExchangeFeeRateInput] = useState('');

    useEffect(() => {
        if (isOpen && currentSettings) {
            setConversionRateInput(currentSettings.conversionRate?.toString() || '');
            setTradeFeeRateInput(currentSettings.tradeFeeRate?.toString() || '');
            setExchangeFeeRateInput(currentSettings.exchangeFeeRate?.toString() || '');
        }
    }, [isOpen, currentSettings]);

    const handleSubmit = async () => {
        const newConversionRate = parseFloat(conversionRateInput);
        const newTradeFeeRate = parseFloat(tradeFeeRateInput);
        const newExchangeFeeRate = parseFloat(exchangeFeeRateInput);

        if (!classId) {
            console.error('[MarketSettingsModal] ❌ classId가 없음');
            showFeedback('error', '클래스 정보가 아직 로드되지 않았습니다.');
            return;
        }

        console.log('[MarketSettingsModal] 🔁 제출 시작', {
            classId,
            newConversionRate,
            newTradeFeeRate,
            newExchangeFeeRate,
        });

        if (isNaN(newConversionRate) || newConversionRate <= 0) {
            showFeedback('error', '환율은 0보다 큰 숫자여야 합니다.');
            return;
        }
        if (isNaN(newTradeFeeRate) || newTradeFeeRate < 0 || newTradeFeeRate >= 1) {
            showFeedback('error', '주식 거래 수수료율은 0과 1 사이의 숫자여야 합니다 (예: 0.002는 0.2%).');
            return;
        }
        if (isNaN(newExchangeFeeRate) || newExchangeFeeRate < 0 || newExchangeFeeRate >= 1) {
            showFeedback('error', '환전 수수료율은 0과 1 사이의 숫자여야 합니다 (예: 0.015는 1.5%).');
            return;
        }

        const result = await onSubmitSettings({
            conversionRate: newConversionRate,
            tradeFeeRate: newTradeFeeRate,
            exchangeFeeRate: newExchangeFeeRate,
        });

        if (result?.success) {
            console.log('[MarketSettingsModal] ✅ 설정 저장 완료', result);
            showFeedback('success', result.message);
            onClose();
        } else {
            console.error('[MarketSettingsModal] ❌ 저장 실패', result);
            showFeedback('error', result?.error || '저장 중 오류가 발생했습니다.');
        }
    };

    if (!isOpen) return null;

    const localCurrencyUnit = currentSettings?.currencyUnit || '학급화폐';

    return (
        <Modal isOpen={isOpen} title="⚙️ 시장 설정 (관리자)" onClose={onClose} size="md">
            <div className="space-y-6">
                {/* 환율 설정 */}
                <div>
                    <h4 className="text-md font-semibold text-slate-700 mb-1">환율 설정</h4>
                    <p className="text-xs text-slate-500 mb-2">1 USD 당 {localCurrencyUnit} 수</p>
                    <InputField
                        type="number"
                        value={conversionRateInput}
                        onChange={(e) => setConversionRateInput(e.target.value)}
                        placeholder="예: 25"
                        step="0.0001"
                    />
                </div>

                {/* 주식 거래 수수료율 설정 */}
                <div>
                    <h4 className="text-md font-semibold text-slate-700 mb-1">주식 거래 수수료율 설정</h4>
                    <p className="text-xs text-slate-500 mb-2">(0.01 = 1%)</p>
                    <InputField
                        type="number"
                        value={tradeFeeRateInput}
                        onChange={(e) => setTradeFeeRateInput(e.target.value)}
                        placeholder="예: 0.002 (0.2%)"
                        step="0.0001"
                    />
                </div>

                {/* 환전 수수료율 설정 */}
                <div>
                    <h4 className="text-md font-semibold text-slate-700 mb-1">환전 수수료율 설정</h4>
                    <p className="text-xs text-slate-500 mb-2">(0.01 = 1%)</p>
                    <InputField
                        type="number"
                        value={exchangeFeeRateInput}
                        onChange={(e) => setExchangeFeeRateInput(e.target.value)}
                        placeholder="예: 0.015 (1.5%)"
                        step="0.0001"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                    <Button onClick={onClose} variant="secondary" color="gray">취소</Button>
                    <Button
                        onClick={handleSubmit}
                        color="indigo"
                        icon={SlidersHorizontal}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '저장 중...' : '설정 저장'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default MarketSettingsModal;

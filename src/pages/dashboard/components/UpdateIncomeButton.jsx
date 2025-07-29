import React, { useState } from 'react';
import { Button, Spinner } from '../../../components/ui';
import { RefreshCw } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { triggerTaxIncomeUpdate } from '../../tax/services/dashboardTaxService'; // 수입 업데이트 함수 import

const UpdateIncomeButton = () => {
    const { classId } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateClick = async () => {
        if (!classId) {
            alert("학급이 선택되지 않았습니다.");
            return;
        }
        setIsLoading(true);
        const result = await triggerTaxIncomeUpdate(classId); // ⭐ 수입 업데이트 함수 호출
        alert(result.message);
        setIsLoading(false);
    };

    return (
        <Button onClick={handleUpdateClick} disabled={isLoading || !classId} size="sm" variant="outline">
            {isLoading ? <Spinner size="xs" className="mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {isLoading ? '수입 집계 중...' : '수입 집계'}
        </Button>
    );
};

export default UpdateIncomeButton;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext'; // 경로 수정!
import PropertyGrid from './components/PropertyGrid';

const RealEstatePage = () => {
  const navigate = useNavigate();
  const { userData } = useUser();

  // 교사/관리자인지 확인
  const isTeacherOrAdmin = userData?.role === 'teacher' || userData?.role === 'admin';

  const handleEditLayout = () => {
    navigate('/realestate/layout');
  };

  const handleBackToLayout = () => {
    navigate('/realestate/layout');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🏠 FinClass 부동산
              </h1>
              <p className="text-gray-600">
                교실 자리를 부동산으로! 매매와 임대를 통해 경제를 배워보세요.
              </p>
            </div>

            {/* 교사용 편집 버튼 */}
            {isTeacherOrAdmin && (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleEditLayout}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <span>⚙️</span>
                  <span>배치 편집</span>
                </button>

                <div className="text-xs text-gray-500 text-center">
                  교사 전용
                </div>
              </div>
            )}
          </div>
        </div>

        <PropertyGrid />
      </div>
    </div>
  );
};

export default RealEstatePage;
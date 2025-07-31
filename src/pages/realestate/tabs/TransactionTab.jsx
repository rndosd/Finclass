import React from 'react';
import { formatCurrency } from '../utils/propertyCalculations';

const TransactionTab = () => {
  // 임시 거래 내역 데이터 (나중에 Firebase에서 가져올 예정)
  const transactions = [
    {
      id: 'tx001',
      propertyId: 'A-1',
      type: 'purchase',
      price: 150,
      timestamp: '2024-01-15 14:30',
      description: 'A-1 창가석 구매'
    },
    {
      id: 'tx002',
      propertyId: 'B-3',
      type: 'sale',
      price: 110,
      timestamp: '2024-01-15 13:15',
      description: 'B-3 일반석 판매'
    },
    {
      id: 'tx003',
      propertyId: 'C-2',
      type: 'rent',
      price: 3,
      timestamp: '2024-01-15 12:00',
      description: 'C-2 일반석 임대료 지급'
    }
  ];

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'purchase': return '🏠';
      case 'sale': return '💰';
      case 'rent': return '🏠';
      default: return '📋';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'purchase': return 'text-blue-600';
      case 'sale': return 'text-green-600';
      case 'rent': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'purchase': return '구매';
      case 'sale': return '판매';
      case 'rent': return '임대료';
      default: return '거래';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📋 거래 내역</h3>
        <div className="text-sm text-gray-500">
          최근 거래만 표시됩니다
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-600">거래 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-gray-600">
                      {transaction.timestamp}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={ont-bold }>
                    {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.price)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getTransactionLabel(transaction.type)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거래 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {transactions.filter(t => t.type === 'purchase').length}
          </div>
          <div className="text-sm text-gray-600">구매 횟수</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.type === 'sale').length}
          </div>
          <div className="text-sm text-gray-600">판매 횟수</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {transactions.filter(t => t.type === 'rent').length}
          </div>
          <div className="text-sm text-gray-600">임대 횟수</div>
        </div>
      </div>
    </div>
  );
};

export default TransactionTab;

import React, { useEffect } from 'react';

const Modal = ({ isOpen = true, children, onClose, title, size = 'md' }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className={`bg-white rounded-xl shadow-xl w-full ${size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-5xl' : 'max-w-3xl'
                    } max-h-[90vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 기존 하위 호환용 title prop → 자동 헤더 렌더링 */}
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            aria-label="Close modal"
                        >
                            X
                        </button>
                    </div>
                )}

                {/* 
                  title 사용 시 → children 을 자동으로 Modal.Body 처럼 감싸서 padding 적용! 
                  (기존 모달들 깨지지 않게!)
                */}
                {title ? (
                    <div className="p-5 sm:p-6 overflow-y-auto flex-grow">
                        {children}
                    </div>
                ) : (
                    /* 새 패턴(Modal.Header/Body/Footer)은 → 그대로 children 출력 */
                    children
                )}
            </div>
        </div>
    );
};

// Header
Modal.Header = ({ children }) => (
    <div className="flex items-center justify-between p-4 sm:p-5 border-b">
        {children}
    </div>
);

// Title
Modal.Title = ({ children }) => (
    <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{children}</h3>
);

// Body
Modal.Body = ({ children }) => (
    <div className="p-5 sm:p-6 overflow-y-auto flex-grow">
        {children}
    </div>
);

// Footer
Modal.Footer = ({ children }) => (
    <div className="p-4 sm:p-5 border-t flex justify-end gap-3">
        {children}
    </div>
);

export default Modal;


import React from 'react';
import DocumentTextIcon from '../components/icons/DocumentTextIcon'; // Re-using for now

const OrdersPage: React.FC = () => {
  return (
    <div className="p-6 bg-gray-800 shadow-xl rounded-lg text-center text-gray-300">
      <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-white">Ordens de Serviço (OS)</h2>
      <p className="text-gray-400 mt-2">
        Esta seção está em desenvolvimento.
      </p>
      <p className="text-gray-500 mt-1">
        Aqui você poderá gerenciar suas ordens de serviço, converter orçamentos em OS e acompanhar o status.
      </p>
    </div>
  );
};

export default OrdersPage;

import React from 'react';

const ProductsPage: React.FC = () => {
  console.log('🚀 ProductsPage renderizando...');
  
  return (
    <div className="p-6 text-gray-300">
      <div className="bg-green-600 p-4 rounded-lg mb-4">
        <h1 className="text-white text-xl font-bold">
          ✅ ProductsPage está funcionando!
        </h1>
        <p className="text-green-100 mt-2">
          Se você está vendo esta mensagem, o componente está carregando corretamente.
        </p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-white text-lg mb-4">🔧 Teste de Funcionalidades</h2>
        
        <div className="space-y-3">
          <div className="bg-gray-700 p-3 rounded">
            <strong className="text-yellow-400">Console:</strong> Verifique o console (F12) para logs
          </div>
          
          <div className="bg-gray-700 p-3 rounded">
            <strong className="text-yellow-400">CSS:</strong> Se as cores estão aparecendo, o Tailwind funciona
          </div>
          
          <div className="bg-gray-700 p-3 rounded">
            <strong className="text-yellow-400">Roteamento:</strong> Se chegou aqui, o React Router funciona
          </div>
        </div>
        
        <button 
          onClick={() => {
            console.log('👆 Botão clicado!');
            alert('Evento onClick funcionando!');
          }}
          className="mt-4 bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600"
        >
          🧪 Testar Eventos
        </button>
      </div>
      
      <div className="mt-6 bg-blue-900 p-4 rounded-lg">
        <h3 className="text-blue-200 font-semibold mb-2">🔍 Próximos Passos de Debug:</h3>
        <ol className="text-blue-100 space-y-1 list-decimal list-inside">
          <li>Confirme que esta página carrega sem erros</li>
          <li>Verifique o console para mensagens de log</li>
          <li>Teste o botão acima</li>
          <li>Se tudo funcionar, o problema está na complexidade do código original</li>
        </ol>
      </div>
    </div>
  );
};

export default ProductsPage;
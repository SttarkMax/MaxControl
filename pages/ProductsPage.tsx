import React from 'react';

const ProductsPage: React.FC = () => {
  console.log('🚀 ProductsPage iniciada');
  
  // Teste se o problema é no JSX
  const testText = "TESTE: Se você está vendo isso, o JSX básico funciona";
  
  console.log('📝 Texto de teste:', testText);
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'red', 
      color: 'white',
      fontSize: '20px',
      minHeight: '100vh'
    }}>
      <h1>🔴 PÁGINA DE PRODUTOS - TESTE EXTREMO</h1>
      <p>{testText}</p>
      <p>Se você não está vendo este texto, o problema é no JSX ou no CSS.</p>
      
      <div style={{ backgroundColor: 'blue', padding: '10px', margin: '10px' }}>
        <p>Este é um teste com div azul</p>
      </div>
      
      <div style={{ backgroundColor: 'green', padding: '10px', margin: '10px' }}>
        <p>Este é um teste com div verde</p>
      </div>
      
      <button 
        onClick={() => console.log('Botão clicado!')}
        style={{ 
          padding: '10px', 
          fontSize: '16px', 
          backgroundColor: 'yellow',
          color: 'black',
          border: 'none',
          margin: '10px'
        }}
      >
        CLIQUE AQUI PARA TESTAR
      </button>
    </div>
  );
};

export default ProductsPage;
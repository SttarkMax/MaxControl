
# Backend para MaxControl

Este é o servidor backend para a aplicação MaxControl, construído com Node.js, Express, e TypeScript. Ele fornece a API RESTful que o frontend em React consome e se conecta a um banco de dados MySQL.

## Pré-requisitos

- **Node.js**: Versão 18.x ou superior.
- **NPM**: Geralmente vem com o Node.js.
- **MySQL**: Uma instância do servidor MySQL rodando (localmente ou em um servidor remoto).

## Guia de Instalação e Inicialização

Siga estes passos para configurar e rodar o backend localmente.

### 1. Instalar Dependências

Navegue até o diretório `backend` no seu terminal e execute o comando para instalar todos os pacotes necessários definidos no `package.json`.

```bash
cd backend
npm install
```

### 2. Configurar o Banco de Dados

1.  **Crie um Banco de Dados**: Usando seu cliente MySQL preferido (MySQL Workbench, DBeaver, ou linha de comando), crie um novo banco de dados. Recomendamos o nome `maxcontrol_db`.
    ```sql
    CREATE DATABASE maxcontrol_db;
    ```
2.  **Execute o Schema**: Importe e execute o arquivo `sql/schema.sql` neste banco de dados. Isso criará todas as tabelas necessárias para a aplicação.

### 3. Configurar Variáveis de Ambiente

1.  **Crie o arquivo `.env`**: Na raiz do diretório `backend`, crie um novo arquivo chamado `.env`.
2.  **Copie o conteúdo**: Copie o conteúdo do arquivo `.env.example` para o seu novo arquivo `.env`.
3.  **Preencha os valores**: Atualize os valores no arquivo `.env` com as suas credenciais reais do banco de dados e defina um segredo para a sessão.

    ```dotenv
    # Configurações do Banco de Dados
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=sua_senha_do_mysql
    DB_NAME=maxcontrol_db
    DB_PORT=3306

    # Configuração da Aplicação
    PORT=3001
    SESSION_SECRET=seu_segredo_super_secreto_aqui_troque_isso
    ```
    > **Importante**: Substitua `sua_senha_do_mysql` e `seu_segredo_super_secreto_aqui_troque_isso` por valores seguros.

### 4. Iniciar o Servidor

Após instalar as dependências e configurar o ambiente, você pode iniciar o servidor.

-   **Para desenvolvimento (com recarregamento automático a cada alteração):**
    ```bash
    npm run dev
    ```
-   **Para produção (compila o TypeScript para JavaScript e inicia o servidor):**
    ```bash
    npm start
    ```

O servidor agora estará rodando em `http://localhost:3001` (ou a porta que você definiu no arquivo `.env`).

### 5. Acessando a Aplicação

Abra seu navegador e acesse `http://localhost:3001`. O backend servirá automaticamente a aplicação frontend e todas as chamadas de API feitas pelo frontend (para `/api/...`) serão direcionadas para este servidor.

### Primeiro Acesso

Ao acessar a página de login pela primeira vez, use as seguintes credenciais:
-   **Usuário**: `admin`
-   **Senha**: `admin`

O backend detectará que é o primeiro login e criará automaticamente o usuário administrador no banco de dados.

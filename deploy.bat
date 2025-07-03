@echo off
chcp 65001 >nul
echo 🚀 Iniciando processo de deploy...

set FRONTEND_BUILD_DIR=dist
set BACKEND_DIR=backend

:: Verificar se está no diretório correto
if not exist package.json (
    echo [ERROR] package.json não encontrado! Execute este script no diretório raiz do projeto.
    pause
    exit /b 1
)

:: 1. Instalar dependências
echo [INFO] Instalando dependências...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao instalar dependências!
    pause
    exit /b 1
)

:: 2. Build do frontend
echo [INFO] Construindo frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Falha no build do frontend!
    pause
    exit /b 1
)

:: 3. Verificar se o build foi criado
if not exist %FRONTEND_BUILD_DIR% (
    echo [ERROR] Diretório de build não encontrado: %FRONTEND_BUILD_DIR%
    pause
    exit /b 1
)

:: 4. Criar arquivo .htaccess no build
echo [INFO] Criando .htaccess...
(
echo # Configuração para React Router (SPA^)
echo ^<IfModule mod_rewrite.c^>
echo   RewriteEngine On
echo   RewriteBase /
echo   RewriteRule ^^index\.html$ - [L]
echo   RewriteCond %%{REQUEST_FILENAME} !-f
echo   RewriteCond %%{REQUEST_FILENAME} !-d
echo   RewriteCond %%{REQUEST_FILENAME} !-l
echo   RewriteRule . /index.html [L]
echo ^</IfModule^>
echo.
echo # Cache Control
echo ^<IfModule mod_expires.c^>
echo   ExpiresActive On
echo   ExpiresByType text/css "access plus 1 year"
echo   ExpiresByType application/javascript "access plus 1 year"
echo   ExpiresByType image/png "access plus 1 year"
echo   ExpiresByType image/jpg "access plus 1 year"
echo   ExpiresByType image/jpeg "access plus 1 year"
echo   ExpiresByType image/gif "access plus 1 year"
echo   ExpiresByType image/svg+xml "access plus 1 year"
echo ^</IfModule^>
echo.
echo # Compressão GZIP
echo ^<IfModule mod_deflate.c^>
echo   AddOutputFilterByType DEFLATE text/plain
echo   AddOutputFilterByType DEFLATE text/html
echo   AddOutputFilterByType DEFLATE text/xml
echo   AddOutputFilterByType DEFLATE text/css
echo   AddOutputFilterByType DEFLATE application/xml
echo   AddOutputFilterByType DEFLATE application/xhtml+xml
echo   AddOutputFilterByType DEFLATE application/rss+xml
echo   AddOutputFilterByType DEFLATE application/javascript
echo   AddOutputFilterByType DEFLATE application/x-javascript
echo ^</IfModule^>
) > %FRONTEND_BUILD_DIR%\.htaccess

:: 5. Criar arquivo ZIP para upload (usando PowerShell)
echo [INFO] Criando arquivo ZIP para upload...
if exist maxcontrol-frontend.zip del maxcontrol-frontend.zip
powershell -Command "Compress-Archive -Path '%FRONTEND_BUILD_DIR%\*' -DestinationPath 'maxcontrol-frontend.zip' -Force"

:: 6. Verificar se o backend existe
if exist %BACKEND_DIR% (
    echo [INFO] Verificando backend...
    if exist %BACKEND_DIR%\package.json (
        echo [INFO] Backend configurado corretamente
        
        if not exist %BACKEND_DIR%\.env.example (
            echo [INFO] Criando .env.example...
            (
            echo # Variáveis de ambiente para o backend
            echo NODE_ENV=production
            echo PORT=3001
            echo.
            echo # Banco de dados
            echo DB_HOST=localhost
            echo DB_USER=seu_usuario
            echo DB_PASSWORD=sua_senha
            echo DB_NAME=seu_banco
            echo DB_PORT=3306
            echo.
            echo # Sessão
            echo SESSION_SECRET=sua_chave_secreta_super_segura
            echo.
            echo # API Keys (se necessário^)
            echo GEMINI_API_KEY=sua_api_key_gemini
            ) > %BACKEND_DIR%\.env.example
        )
    ) else (
        echo [WARN] Backend não configurado adequadamente
    )
) else (
    echo [WARN] Diretório backend não encontrado
)

:: 7. Instruções finais
echo.
echo ✅ Build concluído com sucesso!
echo.
echo 📁 Arquivos criados:
echo    - maxcontrol-frontend.zip (para upload no cPanel)
echo    - %FRONTEND_BUILD_DIR%/ (conteúdo do build)
echo.
echo 🚀 Próximos passos:
echo.
echo FRONTEND (cPanel):
echo 1. Faça upload do arquivo 'maxcontrol-frontend.zip' para o cPanel
echo 2. Extraia o arquivo na pasta 'public_html'
echo 3. Certifique-se de que o arquivo .htaccess foi criado
echo.
echo BACKEND (Render):
echo 1. Faça push do código para o GitHub
echo 2. Conecte o repositório no Render
echo 3. Configure as variáveis de ambiente:
echo    - NODE_ENV=production
echo    - DB_HOST=seu_host_mysql
echo    - DB_USER=seu_usuario
echo    - DB_PASSWORD=sua_senha
echo    - DB_NAME=seu_banco
echo    - DB_PORT=3306
echo    - SESSION_SECRET=chave_secreta_aleatoria
echo 4. Configure o comando de build: npm run build
echo 5. Configure o comando de start: npm start
echo.
echo 🔧 Lembre-se de:
echo 1. Atualizar a URL do backend no utils.ts
echo 2. Configurar o CORS com seu domínio real
echo 3. Configurar o banco MySQL no cPanel
echo 4. Testar todas as funcionalidades após deploy
echo.
echo [INFO] Deploy preparado! 🎉

if exist maxcontrol-frontend.zip (
    echo.
    echo 📦 ZIP criado com sucesso!
    echo    Arquivo: maxcontrol-frontend.zip
    for %%A in (maxcontrol-frontend.zip) do echo    Tamanho: %%~zA bytes
) else (
    echo [ERROR] Falha ao criar arquivo ZIP!
    pause
    exit /b 1
)

echo.
echo Pressione qualquer tecla para continuar...
pause >nul
# Script de deploy para MaxControl - Windows PowerShell
Write-Host "🚀 Iniciando processo de deploy..." -ForegroundColor Green

# Configurar variáveis
$FRONTEND_BUILD_DIR = "dist"
$BACKEND_DIR = "backend"

# Função para logs coloridos
function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Error "package.json não encontrado! Execute este script no diretório raiz do projeto."
    exit 1
}

# 1. Instalar dependências
Write-Info "Instalando dependências..."
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "NPM install falhou"
    }
} catch {
    Write-Error "Falha ao instalar dependências!"
    exit 1
}

# 2. Build do frontend
Write-Info "Construindo frontend..."
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "NPM build falhou"
    }
} catch {
    Write-Error "Falha no build do frontend!"
    exit 1
}

# 3. Verificar se o build foi criado
if (-not (Test-Path $FRONTEND_BUILD_DIR)) {
    Write-Error "Diretório de build não encontrado: $FRONTEND_BUILD_DIR"
    exit 1
}

# 4. Criar arquivo .htaccess no build
Write-Info "Criando .htaccess..."
$htaccessContent = @'
# Configuração para React Router (SPA)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Cache Control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Compressão GZIP
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
'@

$htaccessPath = Join-Path $FRONTEND_BUILD_DIR ".htaccess"
$htaccessContent | Out-File -FilePath $htaccessPath -Encoding UTF8

# 5. Criar arquivo ZIP para upload
Write-Info "Criando arquivo ZIP para upload..."
$zipPath = "maxcontrol-frontend.zip"

# Remover ZIP anterior se existir
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Criar ZIP usando PowerShell 5.0+ ou .NET
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory((Get-Item $FRONTEND_BUILD_DIR).FullName, (Join-Path (Get-Location) $zipPath))
} catch {
    # Fallback para PowerShell mais antigo
    Write-Info "Usando método alternativo para criar ZIP..."
    Compress-Archive -Path "$FRONTEND_BUILD_DIR\*" -DestinationPath $zipPath -Force
}

# 6. Verificar se o backend existe
if (Test-Path $BACKEND_DIR) {
    Write-Info "Verificando backend..."
    $backendPackageJson = Join-Path $BACKEND_DIR "package.json"
    
    if (Test-Path $backendPackageJson) {
        Write-Info "Backend configurado corretamente"
        
        # Criar arquivo de exemplo para variáveis de ambiente
        $envExamplePath = Join-Path $BACKEND_DIR ".env.example"
        if (-not (Test-Path $envExamplePath)) {
            Write-Info "Criando .env.example..."
            $envContent = @'
# Variáveis de ambiente para o backend
NODE_ENV=production
PORT=3001

# Banco de dados
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco
DB_PORT=3306

# Sessão
SESSION_SECRET=sua_chave_secreta_super_segura

# API Keys (se necessário)
GEMINI_API_KEY=sua_api_key_gemini
'@
            $envContent | Out-File -FilePath $envExamplePath -Encoding UTF8
        }
    } else {
        Write-Warn "Backend não configurado adequadamente"
    }
} else {
    Write-Warn "Diretório backend não encontrado"
}

# 7. Instruções finais
Write-Info "✅ Build concluído com sucesso!"
Write-Host ""
Write-Host "📁 Arquivos criados:" -ForegroundColor Cyan
Write-Host "   - maxcontrol-frontend.zip (para upload no cPanel)" -ForegroundColor White
Write-Host "   - $FRONTEND_BUILD_DIR/ (conteúdo do build)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "FRONTEND (cPanel):" -ForegroundColor Yellow
Write-Host "1. Faça upload do arquivo 'maxcontrol-frontend.zip' para o cPanel"
Write-Host "2. Extraia o arquivo na pasta 'public_html'"
Write-Host "3. Certifique-se de que o arquivo .htaccess foi criado"
Write-Host ""
Write-Host "BACKEND (Render):" -ForegroundColor Yellow
Write-Host "1. Faça push do código para o GitHub"
Write-Host "2. Conecte o repositório no Render"
Write-Host "3. Configure as variáveis de ambiente:"
Write-Host "   - NODE_ENV=production"
Write-Host "   - DB_HOST=seu_host_mysql"
Write-Host "   - DB_USER=seu_usuario"
Write-Host "   - DB_PASSWORD=sua_senha"
Write-Host "   - DB_NAME=seu_banco"
Write-Host "   - DB_PORT=3306"
Write-Host "   - SESSION_SECRET=chave_secreta_aleatoria"
Write-Host "4. Configure o comando de build: npm run build"
Write-Host "5. Configure o comando de start: npm start"
Write-Host ""
Write-Host "🔧 Lembre-se de:" -ForegroundColor Yellow
Write-Host "1. Atualizar a URL do backend no utils.ts"
Write-Host "2. Configurar o CORS com seu domínio real"
Write-Host "3. Configurar o banco MySQL no cPanel"
Write-Host "4. Testar todas as funcionalidades após deploy"
Write-Host ""
Write-Info "Deploy preparado! 🎉"

# Verificar se o ZIP foi criado com sucesso
if (Test-Path $zipPath) {
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host ""
    Write-Host "📦 ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "   Arquivo: $zipPath" -ForegroundColor White
    Write-Host "   Tamanho: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
} else {
    Write-Error "Falha ao criar arquivo ZIP!"
    exit 1
}

Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
create database Agape_BD;
use Agape_BD;

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    xp_total INT DEFAULT 0,
    fase_atual INT DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE niveis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    xp_total INT NOT NULL DEFAULT 30, -- XP total para o nível (padrão 30)
    ativo BOOLEAN DEFAULT false,
    posicao INT,
    usuario_id INT NOT NULL, -- ID do usuário que cadastrou o nível
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);


CREATE TABLE perguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nivel_id INT NOT NULL,
    texto TEXT NOT NULL,
    resposta_correta VARCHAR(255) NOT NULL,
    opcao1 VARCHAR(255) NOT NULL, -- Resposta incorreta 1
    opcao2 VARCHAR(255) NOT NULL, -- Resposta incorreta 2
    opcao3 VARCHAR(255) NOT NULL, -- Resposta incorreta 3
    ordem INT NOT NULL, -- Ordem da pergunta no nível (1 a 10)
    usuario_id INT NOT NULL, -- ID do usuário que cadastrou a pergunta
    FOREIGN KEY (nivel_id) REFERENCES niveis(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE ProgressoUsuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nivel_id INT NOT NULL,
    concluido BOOLEAN DEFAULT false,
    xp_ganho INT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (nivel_id) REFERENCES niveis(id)
);

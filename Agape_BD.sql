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
	ordem INT NOT NULL DEFAULT 1,
    usuario_id INT NOT NULL, -- ID do usuário que cadastrou a pergunta
    FOREIGN KEY (nivel_id) REFERENCES niveis(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE ProgressoUsuario (
   id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nivel_id INT NOT NULL,
    xp_ganho INT DEFAULT 0,
    concluido BOOLEAN DEFAULT false,
    ordem INT DEFAULT 0,
	UNIQUE (usuario_id, nivel_id, ordem),
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (nivel_id) REFERENCES niveis(id)
);

CREATE TABLE IF NOT EXISTS Versoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    abreviacao VARCHAR(20) NOT NULL UNIQUE
);


CREATE TABLE Anotacoes (
    id_anotacao INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    versao VARCHAR(50) NOT NULL,
    livro VARCHAR(100) NOT NULL,
    capitulo INT NOT NULL,
    versiculo INT NOT NULL,
    texto_versiculo TEXT NOT NULL,
    texto_anotacao TEXT NOT NULL,
    visibilidade ENUM('public', 'private') NOT NULL DEFAULT 'private',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS Livros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ordem INT NOT NULL
);

CREATE TABLE IF NOT EXISTS Capitulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    livro_id INT NOT NULL,
    numero INT NOT NULL,
    FOREIGN KEY (livro_id) REFERENCES Livros(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Versiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    capitulo_id INT NOT NULL,
    versao_id INT NOT NULL,
    numero INT NOT NULL,
    texto TEXT NOT NULL,
    FOREIGN KEY (capitulo_id) REFERENCES Capitulos(id) ON DELETE CASCADE,
    FOREIGN KEY (versao_id) REFERENCES Versoes(id) ON DELETE CASCADE
);


CREATE TABLE Curtidas (
    id_curtida INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    anotacao_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (anotacao_id) REFERENCES Anotacoes(id_anotacao) ON DELETE CASCADE,
    UNIQUE (usuario_id, anotacao_id)
);

CREATE TABLE Comentarios (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    anotacao_id INT NOT NULL,
    texto TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (anotacao_id) REFERENCES Anotacoes(id_anotacao) ON DELETE CASCADE
);

CREATE TABLE Amizades (
  id_amizade INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario1 INT NOT NULL,
  id_usuario2 INT NOT NULL,
  status ENUM('pendente', 'aceito', 'recusado') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario1) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario2) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE (id_usuario1, id_usuario2)
);

SELECT * FROM amizades;


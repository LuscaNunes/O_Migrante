-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS Biblias;
USE Biblias;

-- Tabela testament
CREATE TABLE IF NOT EXISTS `testament`(
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(254) NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

INSERT INTO testament(name) VALUES ('Velho Testamento'),('Novo Testamento');

-- Tabela books
CREATE TABLE IF NOT EXISTS `books`(
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` NVARCHAR(245) NULL,
    `abbrev` VARCHAR(245) NULL,
    `testament` VARCHAR(245) NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

INSERT INTO books(name, abbrev,testament) VALUES 
('Gênesis','gn','1'),('Êxodo','ex','1'),('Levítico','lv','1'),('Números','nm','1'),
('Deuteronômio','dt','1'),('Josué','js','1'),('Juízes','jz','1'),('Rute','rt','1'),
('1º Samuel','1sm','1'),('2º Samuel','2sm','1'),('1º Reis','1rs','1'),('2º Reis','2rs','1'),
('1º Crônicas','1cr','1'),('2º Crônicas','2cr','1'),('Esdras','ed','1'),('Neemias','ne','1'),
('Ester','et','1'),('Jó','job','1'),('Salmos','sl','1'),('Provérbios','pv','1'),
('Eclesiastes','ec','1'),('Cânticos','ct','1'),('Isaías','is','1'),('Jeremias','jr','1'),
('Lamentações de Jeremias','lm','1'),('Ezequiel','ez','1'),('Daniel','dn','1'),
('Oséias','os','1'),('Joel','jl','1'),('Amós','am','1'),('Obadias','ob','1'),
('Jonas','jn','1'),('Miquéias','mq','1'),('Naum','na','1'),('Habacuque','hc','1'),
('Sofonias','sf','1'),('Ageu','ag','1'),('Zacarias','zc','1'),('Malaquias','ml','1'),
('Mateus','mt','1'),('Marcos','mc','1'),('Lucas','lc','1'),('João','jo','1'),
('Atos','at','1'),('Romanos','rm','1'),('1ª Coríntios','1co','1'),('2ª Coríntios','2co','1'),
('Gálatas','gl','1'),('Efésios','ef','1'),('Filipenses','fp','1'),('Colossenses','cl','1'),
('1ª Tessalonicenses','1ts','1'),('2ª Tessalonicenses','2ts','1'),('1ª Timóteo','1tm','1'),
('2ª Timóteo','2tm','1'),('Tito','tt','1'),('Filemom','fm','1'),('Hebreus','hb','1'),
('Tiago','tg','1'),('1ª Pedro','1pe','1'),('2ª Pedro','2pe','1'),('1ª João','1jo','1'),
('2ª João','2jo','1'),('3ª João','3jo','1'),('Judas','jd','1'),('Apocalipse','ap','1');

-- Tabela verses
CREATE TABLE IF NOT EXISTS `verses`(
    `id` INT NOT NULL AUTO_INCREMENT,
    `version` VARCHAR(10) NULL,
    `testament` INT NULL,
    `book` INT NULL,
    `chapter` INT NULL,
    `verse` INT NULL,
    `text` VARCHAR(255) NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- Aumentando o tamanho da coluna text para evitar erros
ALTER TABLE verses MODIFY COLUMN text VARCHAR(1000);
ALTER TABLE verses MODIFY COLUMN text TEXT;

-- Inserção dos versículos (apenas os primeiros para exemplo)
INSERT INTO verses(version,testament,book,chapter,verse,text) VALUES 
('acf','1','1','1','1','No princípio criou Deus o céu e a terra.'),
('acf','1','1','1','2','E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.'),
('acf','1','1','1','3','E disse Deus: Haja luz; e houve luz.'),
('acf','1','1','1','4','E viu Deus que era boa a luz; e fez Deus separação entre a luz e as trevas.'),
('acf','1','1','1','5','E Deus chamou à luz Dia; e às trevas chamou Noite. E foi a tarde e a manhã, o dia primeiro.'),
('acf','1','1','1','6','E disse Deus: Haja uma expansão no meio das águas, e haja separação entre águas e águas.'),
('acf','1','1','1','7','E fez Deus a expansão, e fez separação entre as águas que estavam debaixo da expansão e as águas que estavam sobre a expansão; e assim foi.'),
('acf','1','1','1','8','E chamou Deus à expansão Céus, e foi a tarde e a manhã, o dia segundo.'),
('acf','1','1','1','9','E disse Deus: Ajuntem-se as águas debaixo dos céus num lugar; e apareça a porção seca; e assim foi.'),
('acf','1','1','1','10','E chamou Deus à porção seca Terra; e ao ajuntamento das águas chamou Mares; e viu Deus que era bom.');



SELECT 
    b.name AS livro,
    v.chapter AS capitulo,
    v.verse AS versiculo,
    v.text AS texto
FROM 
    verses v
JOIN 
    books b ON v.book = b.id
WHERE 
    b.abbrev = 'gn'
ORDER BY 
    v.chapter, v.verse;
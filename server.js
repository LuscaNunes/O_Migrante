require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Conectar ao MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "2024",
    database: process.env.DB_NAME || "Agape_BD",
    connectTimeout: 10000
});

db.connect(err => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err);
    } else {
        console.log("Conectado ao MySQL!");
        db.query("SELECT DATABASE() AS db_name", (err, result) => {
            if (err) {
                console.error("Erro ao verificar banco de dados:", err);
            } else {
                console.log("Banco de dados atual:", result[0].db_name);
            }
        });
    }
});

// Gerar Token JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id_usuario, nome: user.nome, email: user.email, tipo: user.tipo },
        process.env.JWT_SECRET || "secreta",
        { expiresIn: "1h" }
    );
};

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send({ auth: false, message: "Token não fornecido." });

    jwt.verify(token, process.env.JWT_SECRET || "secreta", (err, decoded) => {
        if (err) return res.status(403).send({ auth: false, message: "Token inválido." });
        req.user = decoded;
        next();
    });
};

// Middleware para verificar se é administrador
const checkAdmin = (req, res, next) => {
    if (req.user.tipo !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Você não é administrador." });
    }
    next();
};

// Rota de Cadastro
app.post("/register", async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).send("Preencha todos os campos.");
    }

    try {
        const checkUserSql = "SELECT * FROM Usuarios WHERE email = ?";
        db.query(checkUserSql, [email], async (err, results) => {
            if (err) {
                console.error("Erro ao verificar usuário:", err);
                return res.status(500).send("Erro no cadastro.");
            }

            if (results.length > 0) {
                return res.status(400).send("Email já está em uso.");
            }

            const hashedPassword = await bcrypt.hash(senha, 10);
            const insertUserSql = "INSERT INTO Usuarios (nome, email, senha) VALUES (?, ?, ?)";
            db.query(insertUserSql, [nome, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error("Erro no cadastro:", err);
                    return res.status(500).send("Erro no cadastro.");
                }
                res.send("Usuário registrado com sucesso!");
            });
        });
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).send("Erro no cadastro.");
    }
});

// Rota de Login
app.post("/login", (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).send({ auth: false, message: "Preencha todos os campos." });
    }

    const sql = "SELECT * FROM Usuarios WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send({ auth: false, message: "Email ou senha incorretos." });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(senha, user.senha);

        if (!isMatch) {
            return res.status(401).send({ auth: false, message: "Email ou senha incorretos." });
        }

        const token = generateToken(user);
        res.send({ auth: true, token, user });
    });
});

// Rota para buscar usuários (filtro por ID, nome ou e-mail)
app.get("/usuarios", authenticateToken, checkAdmin, (req, res) => {
    const { busca } = req.query;

    if (!busca) {
        return res.status(400).json({ error: "Parâmetro de busca não fornecido." });
    }

    let sql = "SELECT * FROM Usuarios WHERE 1=1";
    const params = [];

    // Verifica se a busca é um ID numérico
    if (!isNaN(busca)) {
        sql += " AND id_usuario = ?";
        params.push(busca);
    } else {
        // Busca por nome ou e-mail (case-insensitive)
        sql += " AND (LOWER(nome) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))";
        params.push(`%${busca}%`, `%${busca}%`);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Erro ao buscar usuários:", err);
            return res.status(500).json({ error: "Erro ao buscar usuários." });
        }
        res.json({ usuarios: results });
    });
});

// Rota para buscar um usuário por ID
app.get("/usuarios/:id", authenticateToken, checkAdmin, (req, res) => {
    const userId = req.params.id;
    const sql = "SELECT * FROM Usuarios WHERE id_usuario = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar usuário:", err);
            return res.status(500).send("Erro ao buscar usuário.");
        }
        if (results.length === 0) {
            return res.status(404).send("Usuário não encontrado.");
        }
        res.send(results[0]);
    });
});

// Rota para editar um usuário
app.put("/usuarios/:id", authenticateToken, checkAdmin, (req, res) => {
    const userId = req.params.id;
    const { nome, email, tipo, xp_total, fase_atual } = req.body;

    if (!nome || !email || !tipo || !xp_total || !fase_atual) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos." });
    }

    const sql = `
        UPDATE Usuarios 
        SET nome = ?, email = ?, tipo = ?, xp_total = ?, fase_atual = ?
        WHERE id_usuario = ?
    `;
    db.query(sql, [nome, email, tipo, xp_total, fase_atual, userId], (err, result) => {
        if (err) {
            console.error("Erro ao editar usuário:", err);
            return res.status(500).json({ success: false, message: "Erro ao editar usuário." });
        }
        res.json({ success: true, message: "Usuário atualizado com sucesso!" });
    });
});

// Rota para verificar o token e retornar dados do usuário
app.get("/verifyToken", authenticateToken, (req, res) => {
    const user = req.user; // Os dados do usuário estão no token
    res.json({ auth: true, user });
});

// Rota para cadastrar níveis
app.post("/niveis", authenticateToken, (req, res) => {
    const { titulo, descricao, xp_total } = req.body;
    const usuario_id = req.user.id; // Extrai o ID do usuário do token

    if (!titulo || !descricao || !xp_total) {
        return res.status(400).send("Preencha todos os campos.");
    }

    const sql = "INSERT INTO niveis (titulo, descricao, xp_total, usuario_id) VALUES (?, ?, ?, ?)";
    db.query(sql, [titulo, descricao, xp_total, usuario_id], (err, result) => {
        if (err) {
            console.error("Erro ao cadastrar nível:", err);
            return res.status(500).send("Erro ao cadastrar nível.");
        }
        res.send({ message: "Nível cadastrado com sucesso!", id: result.insertId });
    });
});

// Rota para listar níveis
// Rota para buscar níveis (filtro por ID, título ou descrição)
app.get("/niveis", authenticateToken, (req, res) => {
    const { busca } = req.query;

    let sql = "SELECT * FROM niveis WHERE 1=1";
    const params = [];

    if (busca) {
        // Verifica se a busca é um ID numérico
        if (!isNaN(busca)) {
            sql += " AND id = ?";
            params.push(busca);
        } else {
            // Busca por título ou descrição (case-insensitive)
            sql += " AND (LOWER(titulo) LIKE LOWER(?) OR LOWER(descricao) LIKE LOWER(?)";
            params.push(`%${busca}%`, `%${busca}%`);
        }
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Erro ao buscar níveis:", err);
            return res.status(500).json({ error: "Erro ao buscar níveis." });
        }
        res.json({ niveis: results });
    });
});

// Rota para cadastrar perguntas
app.post("/perguntas", authenticateToken, checkAdmin, (req, res) => {
    const { nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3 } = req.body;
    const usuario_id = req.user.id; // Extrai o ID do usuário do token

    if (!nivel_id || !texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos." });
    }

    // Calcula a ordem automaticamente
    const sqlGetMaxOrdem = "SELECT MAX(ordem) as max_ordem FROM perguntas WHERE nivel_id = ?";
    db.query(sqlGetMaxOrdem, [nivel_id], (err, results) => {
        if (err) {
            console.error("Erro ao buscar ordem:", err);
            return res.status(500).json({ success: false, message: "Erro ao cadastrar pergunta." });
        }

        const ordem = results[0].max_ordem + 1 || 1;

        const sqlInsert = `
            INSERT INTO perguntas 
            (nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3, ordem, usuario_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(sqlInsert, [
            nivel_id,
            texto,
            resposta_correta,
            opcao1,
            opcao2,
            opcao3,
            ordem,
            usuario_id
        ], (err) => {
            if (err) {
                console.error("Erro ao cadastrar pergunta:", err);
                return res.status(500).json({ success: false, message: "Erro no servidor." });
            }
            res.json({ success: true, message: "Pergunta cadastrada com sucesso!" });
        });
    });
});

// Rota para buscar perguntas aleatórias de um nível
// Rota para buscar perguntas aleatórias de um nível
app.get("/perguntas/aleatorias", authenticateToken, (req, res) => {
    const { nivel_id, quantidade } = req.query;

    console.log("Rota /perguntas/aleatorias chamada");
    console.log("nivel_id:", nivel_id, "tipo:", typeof nivel_id);
    console.log("quantidade:", quantidade, "tipo:", typeof quantidade);

    if (!nivel_id || !quantidade) {
        console.log("Parâmetros inválidos");
        return res.status(400).json({ error: "Parâmetros 'nivel_id' e 'quantidade' são obrigatórios." });
    }

    const nivelIdParam = parseInt(nivel_id);
    const quantidadeParam = parseInt(quantidade);

    if (isNaN(nivelIdParam) || nivelIdParam <= 0) {
        console.log("nivel_id inválido");
        return res.status(400).json({ error: "O parâmetro 'nivel_id' deve ser um número positivo." });
    }

    if (isNaN(quantidadeParam) || quantidadeParam <= 0) {
        console.log("quantidade inválida");
        return res.status(400).json({ error: "O parâmetro 'quantidade' deve ser um número positivo." });
    }

    // Verificar se existem perguntas para o nivel_id e obter o xp_total
    const checkSql = `
        SELECT n.xp_total, COUNT(p.id) AS total 
        FROM niveis n
        LEFT JOIN perguntas p ON p.nivel_id = n.id
        WHERE n.id = ?
        GROUP BY n.id
    `;
    db.query(checkSql, [nivelIdParam], (err, results) => {
        if (err) {
            console.error("Erro ao verificar perguntas e XP total:", err);
            return res.status(500).json({ error: "Erro ao verificar perguntas e XP total." });
        }

        if (results.length === 0 || results[0].total === 0) {
            console.error("Nenhuma pergunta encontrada para nivel_id:", nivelIdParam);
            return res.status(404).json({ error: "Não há perguntas cadastradas para este nível." });
        }

        const xpTotal = results[0].xp_total; // Obtém o XP total do nível

        // Executar a consulta principal para buscar perguntas aleatórias
        const sql = `
            SELECT * FROM perguntas 
            WHERE nivel_id = ? 
            ORDER BY RAND() 
            LIMIT ?
        `;
        console.log("Executando consulta SQL:", sql);
        console.log("Parâmetros:", [nivelIdParam, quantidadeParam]);

        db.query(sql, [nivelIdParam, quantidadeParam], (err, perguntas) => {
            if (err) {
                console.error("Erro no banco:", err);
                return res.status(500).json({ error: "Erro ao buscar perguntas aleatórias." });
            }

            console.log("Resultados da consulta:", perguntas);

            if (perguntas.length === 0) {
                console.error("Nenhuma pergunta encontrada para nivel_id:", nivelIdParam);
                return res.status(404).json({ error: "Não há perguntas suficientes para este nível." });
            }

            // Retorna as perguntas e o XP total do nível
            res.json({ perguntas, xp_total: xpTotal });
        });
    });
});


// Rota para buscar perguntas de um nível específico
app.get("/perguntas", authenticateToken, (req, res) => {
    const nivelId = req.query.nivel_id;

    if (!nivelId) {
        return res.status(400).json({ error: "Parâmetro nivel_id não fornecido." });
    }

    const sql = "SELECT * FROM perguntas WHERE nivel_id = ?";
    db.query(sql, [nivelId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar perguntas:", err);
            return res.status(500).json({ error: "Erro ao buscar perguntas." });
        }
        res.json({ perguntas: results });
    });
});




// Rota para ativar/desativar um nível
app.put("/niveis/:id/ativar", authenticateToken, (req, res) => {
    const nivelId = req.params.id;
    const { ativo, posicao } = req.body;

    if (ativo === undefined) {
        return res.status(400).json({ error: "O campo 'ativo' é obrigatório." });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error("Erro ao iniciar transação:", err);
            return res.status(500).json({ error: "Erro ao processar solicitação." });
        }

        // Verifica se o nível existe
        const checkNivelSql = "SELECT * FROM niveis WHERE id = ?";
        db.query(checkNivelSql, [nivelId], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Erro ao verificar nível:", err);
                    res.status(500).json({ error: "Erro ao verificar nível." });
                });
            }

            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ error: "Nível não encontrado." });
                });
            }

            const nivel = results[0];

            if (!ativo) {
                // Desativar o nível
                const desativarSql = "UPDATE niveis SET ativo = false, posicao = NULL WHERE id = ?";
                db.query(desativarSql, [nivelId], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Erro ao desativar nível:", err);
                            res.status(500).json({ error: "Erro ao desativar nível." });
                        });
                    }

                    // Reordenar os níveis ativos após o nível desativado
                    const reordenarSql = "UPDATE niveis SET posicao = posicao - 1 WHERE posicao > ?";
                    db.query(reordenarSql, [nivel.posicao], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Erro ao reordenar níveis:", err);
                                res.status(500).json({ error: "Erro ao reordenar níveis." });
                            });
                        }

                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Erro ao commitar transação:", err);
                                    res.status(500).json({ error: "Erro ao processar solicitação." });
                                });
                            }
                            res.json({
                                success: true,
                                message: `Nível desativado com sucesso! Os níveis subsequentes foram reordenados.`
                            });
                        });
                    });
                });
            } else {
                // Ativar o nível
                if (!posicao || posicao <= 0) {
                    return db.rollback(() => {
                        res.status(400).json({ error: "Informe uma posição válida." });
                    });
                }

                // Verificar se a posição já está ocupada
                const checkPosicaoSql = "SELECT * FROM niveis WHERE posicao = ?";
                db.query(checkPosicaoSql, [posicao], (err, results) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Erro ao verificar posição:", err);
                            res.status(500).json({ error: "Erro ao verificar posição." });
                        });
                    }

                    if (results.length > 0) {
                        // Deslocar os níveis para a direita
                        const deslocarSql = "UPDATE niveis SET posicao = posicao + 1 WHERE posicao >= ?";
                        db.query(deslocarSql, [posicao], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Erro ao deslocar níveis:", err);
                                    res.status(500).json({ error: "Erro ao deslocar níveis." });
                                });
                            }

                            // Ativar o nível na posição especificada
                            const ativarSql = "UPDATE niveis SET ativo = true, posicao = ? WHERE id = ?";
                            db.query(ativarSql, [posicao, nivelId], (err, result) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Erro ao ativar nível:", err);
                                        res.status(500).json({ error: "Erro ao ativar nível." });
                                    });
                                }

                                db.commit(err => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("Erro ao commitar transação:", err);
                                            res.status(500).json({ error: "Erro ao processar solicitação." });
                                        });
                                    }
                                    res.json({
                                        success: true,
                                        message: `Nível ativado com sucesso na posição ${posicao}!`
                                    });
                                });
                            });
                        });
                    } else {
                        // Ativar o nível na posição especificada
                        const ativarSql = "UPDATE niveis SET ativo = true, posicao = ? WHERE id = ?";
                        db.query(ativarSql, [posicao, nivelId], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Erro ao ativar nível:", err);
                                    res.status(500).json({ error: "Erro ao ativar nível." });
                                });
                            }

                            db.commit(err => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Erro ao commitar transação:", err);
                                        res.status(500).json({ error: "Erro ao processar solicitação." });
                                    });
                                }
                                res.json({
                                    success: true,
                                    message: `Nível ativado com sucesso na posição ${posicao}!`
                                });
                            });
                        });
                    }
                });
            }
        });
    });
});

// Rota para buscar níveis ativos ordenados por posição
app.get("/niveis/ativos", (req, res) => {
    const sql = "SELECT * FROM niveis WHERE ativo = true ORDER BY posicao ASC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erro ao buscar níveis ativos:", err);
            return res.status(500).json({ error: "Erro ao buscar níveis ativos." });
        }
        res.json({ niveis: results }); // Retorna os níveis ativos
    });
});


// Rota para buscar um nível por ID
app.get("/niveis/:id", authenticateToken, (req, res) => {
    const nivelId = req.params.id;
    console.log("Buscando nível com ID:", nivelId); // Log para depuração

    // Verifica se o ID é válido
    if (!nivelId || isNaN(nivelId)) {
        console.error("ID do nível inválido:", nivelId);
        return res.status(400).json({ error: "ID do nível inválido." });
    }

    const sql = "SELECT * FROM niveis WHERE id = ?";
    db.query(sql, [nivelId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar nível:", err);
            return res.status(500).json({ error: "Erro ao buscar nível." });
        }

        if (results.length === 0) {
            console.error("Nível não encontrado para ID:", nivelId);
            return res.status(404).json({ error: "Nível não encontrado." });
        }

        console.log("Nível encontrado:", results[0]); // Log para verificar os dados retornados
        res.json(results[0]);
    });
});

// Rota para editar um nível
app.put("/niveis/:id", authenticateToken, (req, res) => {
    const nivelId = req.params.id;
    const { titulo, descricao, xp_total } = req.body;

    // Validação dos campos obrigatórios (apenas titulo, descricao e xp_total)
    if (!titulo || !descricao || !xp_total) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos." });
    }

    // Verifica se o nível existe
    const checkNivelSql = "SELECT * FROM niveis WHERE id = ?";
    db.query(checkNivelSql, [nivelId], (err, results) => {
        if (err) {
            console.error("Erro ao verificar nível:", err);
            return res.status(500).json({ success: false, message: "Erro ao verificar nível." });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Nível não encontrado." });
        }

        // Atualiza o nível (sem ativo e posicao)
        const updateNivelSql = `
            UPDATE niveis 
            SET titulo = ?, descricao = ?, xp_total = ?
            WHERE id = ?
        `;
        db.query(
            updateNivelSql,
            [titulo, descricao, xp_total, nivelId],
            (err, result) => {
                if (err) {
                    console.error("Erro ao editar nível:", err);
                    return res.status(500).json({ success: false, message: "Erro ao editar nível." });
                }

                res.json({ success: true, message: "Nível atualizado com sucesso!" });
            }
        );
    });
});

app.delete('/niveis/:id', (req, res) => {
    const nivelId = req.params.id;

    // Lógica para excluir o nível e suas perguntas
    // Exemplo:
    db.query('DELETE FROM niveis WHERE id = ?', [nivelId], (err, result) => {
        if (err) {
            console.error("Erro ao excluir nível:", err);
            return res.status(500).json({ message: "Erro ao excluir nível." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Nível não encontrado." });
        }

        // Excluir perguntas associadas ao nível
        db.query('DELETE FROM perguntas WHERE nivel_id = ?', [nivelId], (err, result) => {
            if (err) {
                console.error("Erro ao excluir perguntas:", err);
                return res.status(500).json({ message: "Erro ao excluir perguntas." });
            }

            res.json({ message: "Nível e perguntas excluídos com sucesso." });
        });
    });
});

app.get('/perguntas/:id', (req, res) => {
    const perguntaId = req.params.id;

    // Consulta ao banco de dados para buscar a pergunta pelo ID
    db.query('SELECT * FROM perguntas WHERE id = ?', [perguntaId], (err, result) => {
        if (err) {
            console.error("Erro ao buscar pergunta:", err);
            return res.status(500).json({ message: "Erro ao buscar pergunta." });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Pergunta não encontrada." });
        }

        // Retorna a pergunta encontrada
        res.json(result[0]);
    });
});
// Rota para testar o banco de dados
app.get("/test-db", (req, res) => {
    db.query("SELECT * FROM perguntas WHERE nivel_id = 1", (err, results) => {
        if (err) {
            console.error("Erro no teste do banco:", err);
            return res.status(500).json({ error: "Erro no banco." });
        }
        console.log("Resultados do teste do banco:", results);
        res.json({ resultados: results });
    });
});



// Rota para buscar uma pergunta por ID (removida a versão sem autenticação)
app.put("/perguntas/:id", authenticateToken, (req, res) => {
    const perguntaId = req.params.id;
    const { texto, resposta_correta, opcao1, opcao2, opcao3 } = req.body;

    if (!texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
        return res.status(400).json({ error: "Preencha todos os campos." });
    }

    // Verificar se a pergunta existe
    const checkSql = "SELECT * FROM perguntas WHERE id = ?";
    db.query(checkSql, [perguntaId], (err, results) => {
        if (err) {
            console.error("Erro ao verificar pergunta:", err);
            return res.status(500).json({ error: "Erro ao verificar pergunta." });
        }

        if (results.length === 0) {
            console.error("Pergunta não encontrada para id:", perguntaId);
            return res.status(404).json({ error: "A pergunta com o ID fornecido não foi encontrada." });
        }

        // Atualizar a pergunta
        const sql = `
            UPDATE perguntas 
            SET texto = ?, resposta_correta = ?, opcao1 = ?, opcao2 = ?, opcao3 = ?
            WHERE id = ?
        `;
        db.query(sql, [texto, resposta_correta, opcao1, opcao2, opcao3, perguntaId], (err, result) => {
            if (err) {
                console.error("Erro ao editar pergunta:", err);
                return res.status(500).json({ error: "Erro ao editar pergunta." });
            }

            res.json({ success: true, message: "Pergunta atualizada com sucesso!" });
        });
    });
});

app.delete("/perguntas/:id", authenticateToken, (req, res) => {
    const perguntaId = req.params.id;

    const sql = "DELETE FROM perguntas WHERE id = ?";
    db.query(sql, [perguntaId], (err, result) => {
        if (err) {
            console.error("Erro ao excluir pergunta:", err);
            return res.status(500).json({ error: "Erro ao excluir pergunta." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Pergunta não encontrada." });
        }

        res.json({ success: true, message: "Pergunta excluída com sucesso!" });
    });
});

// Rota para salvar progresso (chamar quando usuário completar um nível)
app.post('/progresso', authenticateToken, async (req, res) => {
    try {
        const { nivel_id, xp_ganho, ordem } = req.body;
        const usuario_id = req.user.id;

        // Validação básica
        if (!nivel_id || xp_ganho === undefined || !ordem) {
            return res.status(400).json({
                success: false,
                message: "nivel_id, xp_ganho e ordem são obrigatórios"
            });
        }

        // Verificar se o nível existe
        const [nivel] = await db.promise().query(
            'SELECT id FROM niveis WHERE id = ?',
            [nivel_id]
        );
        if (!nivel.length) {
            return res.status(404).json({
                success: false,
                message: "Nível não encontrado"
            });
        }

        // Verificar se já existe progresso para este botão
        const [progresso] = await db.promise().query(
            'SELECT id, concluido FROM ProgressoUsuario WHERE usuario_id = ? AND nivel_id = ? AND ordem = ?',
            [usuario_id, nivel_id, ordem]
        );

        let finalXpGanho = xp_ganho;
        if (progresso.length > 0 && progresso[0].concluido) {
            // Botão já concluído, atribuir XP reduzido (máximo 5)
            finalXpGanho = Math.min(xp_ganho, 5);
        }

        if (progresso.length > 0) {
            // Atualizar o progresso existente
            await db.promise().query(
                'UPDATE ProgressoUsuario SET xp_ganho = ?, concluido = true WHERE id = ?',
                [finalXpGanho, progresso[0].id]
            );
        } else {
            // Criar novo progresso
            await db.promise().query(
                'INSERT INTO ProgressoUsuario (usuario_id, nivel_id, xp_ganho, concluido, ordem) VALUES (?, ?, ?, true, ?)',
                [usuario_id, nivel_id, finalXpGanho, ordem]
            );
        }

        // Atualizar XP total do usuário
        await db.promise().query(
            'UPDATE Usuarios SET xp_total = xp_total + ? WHERE id_usuario = ?',
            [finalXpGanho, usuario_id]
        );

        res.json({
            success: true,
            message: "Progresso salvo com sucesso",
            xp_ganho: finalXpGanho
        });
    } catch (error) {
        console.error("Erro ao salvar progresso:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao salvar progresso",
            details: error.message
        });
    }
});

// Rota para buscar progresso dos botões por nível
app.get("/progresso/botoes/:nivelId", authenticateToken, async (req, res) => {
    try {
        const nivelId = req.params.nivelId;
        const usuarioId = req.user.id;

        // Buscar o progresso do usuário para o nível específico
        const [progresso] = await db.promise().query(
            `
            SELECT ordem, concluido, xp_ganho
            FROM ProgressoUsuario 
            WHERE usuario_id = ? AND nivel_id = ?
            ORDER BY ordem ASC
            `,
            [usuarioId, nivelId]
        );

        // Criar um objeto indicando quais botões estão completos
        const botoesCompletos = {};
        progresso.forEach(item => {
            botoesCompletos[item.ordem] = {
                concluido: item.concluido,
                xp_ganho: item.xp_ganho
            };
        });

        res.json({ botoesCompletos });
    } catch (error) {
        console.error("Erro ao buscar progresso dos botões:", error);
        res.status(500).json({ error: "Erro ao buscar progresso dos botões." });
    }
});

app.get('/progresso/detalhado', authenticateToken, async (req, res) => {
    try {
        const usuario_id = req.user.id;

        // Buscar o progresso detalhado do usuário
        const [progresso] = await db.promise().query(`
            SELECT nivel_id, COUNT(*) AS perguntas_completas
            FROM ProgressoUsuario
            WHERE usuario_id = ? AND concluido = true
            GROUP BY nivel_id
        `, [usuario_id]);

        // Mapear os níveis concluídos
        const niveisCompletos = progresso.reduce((map, item) => {
            map[item.nivel_id] = item.perguntas_completas;
            return map;
        }, {});

        res.json({
            success: true,
            niveisCompletos
        });
    } catch (error) {
        console.error("Erro ao buscar progresso detalhado:", error);
        res.status(500).json({ error: "Erro ao buscar progresso detalhado" });
    }
});

// Iniciar servidor
app.listen(3000, () => console.log(`Servidor rodando na porta 3000 - ${new Date().toLocaleString()}`));
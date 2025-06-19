const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const anotacaoService = require('../services/anotacaoService');
const db = require('../config/database');
const router = express.Router();

/**
 * Rota para criar uma nova anotação
 * POST /anotacoes
 * Requer autenticação
 */
router.post('/', authenticateToken, async (req, res) => {
  const { versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao, visibilidade } = req.body;
  const usuario_id = req.user.id;

  const visibilidadeMapped = visibilidade === 'publico' ? 'public' : visibilidade === 'privado' ? 'private' : visibilidade || 'private';
  console.log('Criando anotação:', { usuario_id, visibilidade, visibilidadeMapped }); // Log para depuração

  try {
    const anotacao = await anotacaoService.criarAnotacao(usuario_id, {
      versao,
      livro,
      capitulo,
      versiculo,
      texto_versiculo,
      texto_anotacao,
      visibilidade: visibilidadeMapped
    });

    res.json({
      success: true,
      message: 'Anotação salva com sucesso.',
      data: {
        ...anotacao,
        visibilidade: anotacao.visibilidade === 'public' ? 'publico' : 'privado'
      }
    });
  } catch (err) {
    console.error('Erro ao salvar anotação:', err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * Rota para listar anotações do usuário autenticado
 * GET /anotacoes?visibilidade=[publico|privado|todos]
 * Requer autenticação
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const visibilidade = req.query.visibilidade;
    const visibilidadeMapped = visibilidade === 'publico' ? 'public' : visibilidade === 'privado' ? 'private' : undefined;
    console.log('Listando anotações:', { usuario_id, visibilidade, visibilidadeMapped }); // Log para depuração

    const anotacoes = await anotacaoService.listarAnotacoes(usuario_id, visibilidadeMapped);
    res.json({
      success: true,
      anotacoes: anotacoes.map(anotacao => ({
        ...anotacao,
        visibilidade: anotacao.visibilidade === 'public' ? 'publico' : 'privado'
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar anotações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar anotações.'
    });
  }
});

/**
 * Rota para atualizar a visibilidade de uma anotação
 * PATCH /anotacoes/:id/visibilidade
 * Requer autenticação
 */
router.patch('/:id/visibilidade', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { visibilidade } = req.body;
  const usuario_id = req.user.id;

  const visibilidadeMapped = visibilidade === 'publico' ? 'public' : visibilidade === 'privado' ? 'private' : visibilidade;
  console.log('Atualizando visibilidade na rota:', { id, usuario_id, visibilidade, visibilidadeMapped }); // Log para depuração

  try {
    const anotacao = await anotacaoService.atualizarVisibilidadeAnotacao(id, usuario_id, visibilidadeMapped);
    res.json({
      success: true,
      message: 'Visibilidade atualizada com sucesso.',
      data: {
        ...anotacao,
        visibilidade: anotacao.visibilidade === 'public' ? 'publico' : 'privado'
      }
    });
  } catch (err) {
    console.error('Erro ao atualizar visibilidade:', err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * Rota para listar anotações públicas de todos os usuários
 * GET /anotacoes/publicas
 * Não requer autenticação
 */
router.get('/publicas', async (req, res) => {
  try {
    const [anotacoes] = await db.promise().query(
      `SELECT 
         a.id_anotacao AS id,
         a.versao,
         a.livro,
         a.capitulo,
         a.versiculo,
         a.texto_versiculo,
         a.texto_anotacao,
         a.visibilidade,
         a.criado_em,
         u.nome AS autor
       FROM Anotacoes a
       JOIN Usuarios u ON a.usuario_id = u.id_usuario
       WHERE a.visibilidade = 'public'
       ORDER BY a.criado_em DESC`
    );
    console.log('Anotações públicas retornadas:', anotacoes); // Log para depuração
    res.json({
      success: true,
      anotacoes: anotacoes.map(anotacao => ({
        ...anotacao,
        visibilidade: anotacao.visibilidade === 'public' ? 'publico' : 'privado'
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar anotações públicas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar anotações públicas.'
    });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const visibilidade = req.query.visibilidade;
    const visibilidadeMapped = visibilidade === 'publico' ? 'public' : visibilidade === 'privado' ? 'private' : undefined;
    console.log('Listando anotações:', { usuario_id, visibilidade, visibilidadeMapped }); // Log para depuração

    const anotacoes = await anotacaoService.listarAnotacoes(usuario_id, visibilidadeMapped);
    res.json({
      success: true,
      anotacoes: anotacoes.map(anotacao => ({
        ...anotacao,
        visibilidade: anotacao.visibilidade === 'public' ? 'publico' : 'privado'
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar anotações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar anotações.'
    });
  }
});

module.exports = router;
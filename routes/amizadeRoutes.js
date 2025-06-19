const express = require('express');
const router = express.Router();
const amizadeService = require('../services/amizadeService');
const { authenticateToken } = require('../middleware/auth');

router.get('/listar', authenticateToken, (req, res) => {
  const userId = req.user.id;
  amizadeService.listarAmizades(userId, (error, result) => {
    if (error) {
      console.error('Erro ao listar amizades:', error.message);
      return res.status(500).json({ success: false, message: 'Erro ao listar amizades.' });
    }
    res.json({ success: true, ...result });
  });
});

router.post('/criar', authenticateToken, (req, res) => {
  const { id_usuario2 } = req.body;
  const id_usuario1 = req.user.id;
  amizadeService.criarSolicitacao(id_usuario1, id_usuario2, (error, id_amizade) => {
    if (error) {
      console.error('Erro ao criar solicitação:', error.message);
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
    res.json({ success: true, id_amizade });
  });
});

router.patch('/:id/atualizar', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  amizadeService.atualizarSolicitacao(id, status, userId, (error) => {
    if (error) {
      console.error('Erro ao atualizar solicitação:', error.message);
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
    res.json({ success: true, message: `Amizade ${status === 'aceito' ? 'aceita' : 'recusada'} com sucesso.` });
  });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  amizadeService.removerAmizade(id, userId, (error) => {
    if (error) {
      console.error('Erro ao remover amizade:', error.message);
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
    res.json({ success: true, message: 'Solicitação ou amizade removida com sucesso.' });
  });
});

router.get('/pesquisar', authenticateToken, (req, res) => {
  console.log('Requisição recebida em /amizades/pesquisar:', req.query);
  const { termo } = req.query;
  const userId = req.user.id;
  console.log('Termo:', termo, 'UserId:', userId);
  if (!termo) {
    return res.status(400).json({ success: false, message: 'Termo de pesquisa é obrigatório.' });
  }
  amizadeService.pesquisarUsuarios(termo, userId, (error, usuarios) => {
    if (error) {
      console.error('Erro ao pesquisar usuários:', error.message);
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
    res.json({ success: true, usuarios });
  });
});

module.exports = router;
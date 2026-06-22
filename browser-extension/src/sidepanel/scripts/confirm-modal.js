/* ============================================================
   ARQUIVO NOVO — salvar em:
   browser-extension/src/sidepanel/scripts/confirm-modal.js

   Lembre de adicionar antes de </body> no sidepanel.html:
   <script src="scripts/confirm-modal.js"></script>

   IMPORTANTE: este script precisa carregar ANTES dos arquivos
   que vão usá-lo (participant.js, etc.) -- coloque o <script>
   logo depois de main.js na ordem de carregamento.
   ============================================================ */

/**
 * Substitui o confirm() nativo do navegador por um modal
 * estilizado dentro da própria interface da extensão.
 *
 * Uso:
 *   const ok = await showConfirmModal({
 *     title: 'Encerrar sessão?',
 *     message: 'Você poderá ver os resultados depois de confirmar.',
 *     icon: '🏁',
 *     confirmText: 'Encerrar',
 *     neutral: false, // true = botão azul (ação neutra), false = vermelho (destrutiva)
 *   });
 *   if (!ok) return;
 *
 * Retorna uma Promise<boolean> -- true se confirmou, false se cancelou.
 */
function showConfirmModal({
  title = 'Confirmar ação',
  message = 'Tem certeza?',
  icon = '⚠️',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  neutral = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay     = document.getElementById('confirm-modal-overlay');
    const btnConfirm   = document.getElementById('confirm-modal-confirm');
    const btnCancel    = document.getElementById('confirm-modal-cancel');

    document.getElementById('confirm-modal-icon').textContent    = icon;
    document.getElementById('confirm-modal-title').textContent   = title;
    document.getElementById('confirm-modal-message').textContent = message;
    btnConfirm.textContent = confirmText;
    btnCancel.textContent  = cancelText;

    btnConfirm.classList.toggle('confirm-modal-neutral', neutral);

    overlay.classList.remove('hidden');

    const cleanup = () => {
      overlay.classList.add('hidden');
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel  = () => { cleanup(); resolve(false); };
    const onOverlayClick = (e) => {
      if (e.target === overlay) { cleanup(); resolve(false); }
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
  });
}

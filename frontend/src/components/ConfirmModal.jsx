import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  const color = type === 'danger' ? '#ff897d' : '#d0bcff';

  return (
    <AnimatePresence>
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 1000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'var(--surface-container-lowest)',
            border: `4px solid ${color}`,
            padding: '32px',
            boxShadow: `12px 12px 0 ${color}`,
            position: 'relative'
          }}
        >
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--on-surface)', cursor: 'pointer', opacity: 0.5 }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', color: color }}>
            <AlertTriangle size={32} />
            <h2 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1 }}>{title}</h2>
          </div>

          <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: 'var(--on-surface)',
                border: '2px solid var(--outline)',
                padding: '14px',
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
              className="hover:bg-surface-container-high transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: color,
                color: type === 'danger' ? '#fff' : '#381e72',
                border: 'none',
                padding: '14px',
                fontSize: '12px',
                fontWeight: '900',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
              className="hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmModal;

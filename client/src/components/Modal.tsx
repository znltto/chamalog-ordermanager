import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-500/75 backdrop-blur-sm overflow-y-auto supports-[not(backdrop-filter:blur(4px))]:bg-gray-500/90"
    >
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4 relative z-60"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-900 hover:text-black"
          >
            <FiX className="text-xl" />
          </button>
          <div className="relative z-60 !bg-white opacity-100">
            {children}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
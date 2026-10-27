import { useContext } from 'react';
import { PixelGameContext } from './PixelGameContext.js';

export default function usePixelGame() {
  return useContext(PixelGameContext);
}

import React, { useRef, useState, useEffect, useCallback } from 'react';

const DrawingBoard = ({ onSave }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [historyUI, setHistoryUI] = useState({ canUndo: false, canRedo: false });

  const MAX_HISTORY = 15; // Limite para evitar travamento em celulares

  // 🔧 Configuração do Canvas (DPR + fundo branco)
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, parent.clientWidth, parent.clientHeight);
  }, [strokeColor, strokeWidth]);

  useEffect(() => {
    setupCanvas();
    saveToHistory(); // Estado inicial em branco
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  // 📸 Gerenciamento de Histórico (usando useRef para evitar stale closures)
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHistory.push(dataUrl);
    if (currentHistory.length > MAX_HISTORY) currentHistory.shift();
    
    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    
    setHistoryUI({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1
    });
  }, []);

  const restoreFromHistory = (index) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Reaplica configurações de desenho
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = tool === 'eraser' ? 'transparent' : strokeColor;
      ctx.lineWidth = tool === 'eraser' ? strokeWidth * 3 : strokeWidth;
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    };
    img.src = historyRef.current[index];
  };

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      restoreFromHistory(historyIndexRef.current);
      setHistoryUI({
        canUndo: historyIndexRef.current > 0,
        canRedo: true
      });
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      restoreFromHistory(historyIndexRef.current);
      setHistoryUI({
        canUndo: true,
        canRedo: historyIndexRef.current < historyRef.current.length - 1
      });
    }
  };

  // 🖱️/👆 Captura de coordenadas
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ✏️ Fluxo de desenho
  const startDrawing = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    ctx.strokeStyle = tool === 'eraser' ? 'transparent' : strokeColor;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      canvasRef.current.getContext('2d').closePath();
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    saveToHistory();
  };

  const saveCanvas = () => {
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSave(dataURL);
  };

  // 🎨 Handlers de Cor/Espessura
  const handleColorChange = (e) => setStrokeColor(e.target.value);
  const handleWidthChange = (e) => setStrokeWidth(parseInt(e.target.value));

  // 📱 UI
  const btnStyle = (active) => ({
    width: 44, height: 44, border: 'none', borderRadius: 10,
    background: active ? '#3498db' : 'transparent', color: '#fff',
    fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  });
  const disabledBtnStyle = { ...btnStyle(false), opacity: 0.3, cursor: 'not-allowed' };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f0f0', touchAction: 'none' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        />
      </div>

      {/* Menu Lateral Otimizado para Mobile */}
      <div style={{ 
        width: 64, background: '#2c3e50', padding: '12px 8px', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        overflowY: 'auto', touchAction: 'manipulation'
      }}>
        <button onClick={() => setTool('pen')} style={btnStyle(tool === 'pen')} title="Caneta">✏️</button>
        <button onClick={() => setTool('eraser')} style={btnStyle(tool === 'eraser')} title="Borracha">🧽</button>
        
        <hr style={{ width: '100%', borderColor: '#4a5568', margin: '4px 0' }} />
        
        <label style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>Cor</label>
        <input type="color" value={strokeColor} onChange={handleColorChange} 
               style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
        
        <label style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>Espessura</label>
        <input type="range" min="1" max="20" value={strokeWidth} onChange={handleWidthChange}
               style={{ width: 40, accentColor: '#3498db' }} />
        
        <hr style={{ width: '100%', borderColor: '#4a5568', margin: '4px 0' }} />
        
        <button onClick={undo} disabled={!historyUI.canUndo} 
                style={historyUI.canUndo ? btnStyle(false) : disabledBtnStyle} title="Desfazer">↩️</button>
        <button onClick={redo} disabled={!historyUI.canRedo} 
                style={historyUI.canRedo ? btnStyle(false) : disabledBtnStyle} title="Refazer">↪️</button>
        
        <button onClick={clearCanvas} style={btnStyle(false)} title="Limpar tudo">🗑️</button>
        <button onClick={saveCanvas} style={btnStyle(false)} title="Salvar">💾</button>
      </div>
    </div>
  );
};

export default DrawingBoard;
// app/game/page.tsx 
'use client'; 

import { useEffect, useState } from 'react'; 

export default function Game() { 
  const [score, setScore] = useState(0); 
  const [fish, setFish] = useState(false); 
  const [multiplier, setMultiplier] = useState(1.5);

  const catchFish = () => { 
    setFish(true); 
    setScore(prev => prev + Math.max(1, Math.round(multiplier)) ); 
    setTimeout(() => setFish(false), 1000); 
  }; 

  useEffect(() => {
    try {
      const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost');
      const m = parseFloat(url.searchParams.get('multiplier') || '1.5');
      if (!Number.isNaN(m) && m >= 1.5) setMultiplier(m);
    } catch {}
  }, []);

  return ( 
    <> 
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        fontFamily: 'Arial, sans-serif', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        minHeight: '100vh', 
        color: 'white' 
      }}> 
        <h1>🎣 FarFISH Game</h1> 
        
        <div style={{ 
          margin: '20px 0', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '15px', 
          display: 'inline-block' 
        }}> 
          <h2>Score: {score}</h2> 
          <p style={{marginTop:'4px'}}>Current multiplier: x{multiplier.toFixed(1)}</p>
          
          <div style={{ 
            width: '200px', 
            height: '150px', 
            background: '#4a90e2', 
            borderRadius: '10px', 
            margin: '20px auto', 
            position: 'relative', 
            overflow: 'hidden', 
            border: '3px solid #357abd' 
          }}> 
            {fish && ( 
              <div style={{ 
                position: 'absolute', 
                bottom: '20px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                fontSize: '40px', 
                animation: 'jump 0.5s ease-in-out' 
              }}> 
                🐟 
              </div> 
            )} 
          </div> 
          
          <button onClick={catchFish} 
            style={{ 
              padding: '12px 30px', 
              background: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '18px', 
              cursor: 'pointer', 
              margin: '10px' 
            }}> 
            Cast Line! 🎣 
          </button> 
        </div> 
        
        <style jsx global>{` 
          @keyframes jump { 
            0% { transform: translateX(-50%) translateY(0); } 
            50% { transform: translateX(-50%) translateY(-30px); } 
            100% { transform: translateX(-50%) translateY(0); } 
          } 
        `}</style> 
      </div> 
    </> 
  ); 
}

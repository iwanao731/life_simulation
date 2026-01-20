import React, { useState, useEffect } from 'react';
import { X, Bot, Key, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { marked } from 'marked';
import { getFinancialAdvice } from '../lib/gemini';

export function AiPlannerModal({ onClose, simulationData }) {
  // Try to load API Key from env or localStorage
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');

  const handleDiagnose = async () => {
    if (!apiKey) {
      setError('APIキーを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    // Save key for future use
    localStorage.setItem('gemini_api_key', apiKey);

    try {
      const result = await getFinancialAdvice(apiKey, simulationData);
      setAdvice(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header ai-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="ai-icon-bg">
              <Sparkles size={20} color="#fff" />
            </div>
            <h3>AI Financial Planner <span className="powered-by">Powered by Gemini</span></h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {!advice ? (
            <div className="ai-setup">
              <p className="ai-description">
                Google Gemini AIがあなたのシミュレーション結果を分析し、
                プロのファイナンシャルプランナー視点で具体的なアドバイスを提供します。
              </p>

              <div className="api-key-section">
                {import.meta.env.VITE_GEMINI_API_KEY ? (
                  <div className="api-key-configured">
                    <CheckCircle size={16} color="#10b981" />
                    <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>
                      API Key 設定済み (.env)
                    </span>
                  </div>
                ) : (
                  <>
                    <label className="input-label">
                      <Key size={14} />
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="input-premium api-input"
                    />
                    <p className="helper-text">
                      ※ 入力されたキーはブラウザ内にのみ保存され、外部サーバーには送信されません。
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {loading ? (
                <div className="loading-container">
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill"></div>
                  </div>
                  <p className="loading-text">
                    <Sparkles size={16} className="spinner" style={{ display: 'inline', marginRight: '4px' }} />
                    専門家AIが家計を詳細に分析中...
                  </p>
                </div>
              ) : (
                <button
                  className="btn-primary start-diagnosis-btn"
                  onClick={handleDiagnose}
                >
                  <Bot size={18} />
                  AI診断を実行する
                </button>
              )}
            </div>
          ) : (
            <div className="ai-result">
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(advice) }} />

              <div className="result-actions">
                <button className="btn-secondary" onClick={() => setAdvice('')}>
                  再診断する
                </button>
                <button className="btn-primary" onClick={onClose} style={{ marginLeft: '1rem' }}>
                  シミュレーションへ戻る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .ai-modal {
          max-width: 700px;
          height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .ai-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 1.25rem 1.5rem;
        }
        .ai-icon-bg {
          background: rgba(255,255,255,0.2);
          padding: 8px;
          border-radius: 12px;
          display: flex;
        }
        .powered-by {
          font-size: 0.8rem;
          opacity: 0.9;
          font-weight: normal;
          margin-left: 8px;
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 99px;
        }
        .ai-setup {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          text-align: center;
        }
        .ai-description {
          color: #475569;
          line-height: 1.6;
          max-width: 500px;
        }
        .api-key-section {
          width: 100%;
          max-width: 400px;
          text-align: left;
        }
        .api-key-configured {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 1rem;
            background: #ecfdf5;
            border-radius: 8px;
            border: 1px solid #10b981;
        }
        .api-input {
          width: 100%;
          font-family: monospace;
          letter-spacing: 0.1em;
        }
        .start-diagnosis-btn {
          width: 100%;
          max-width: 300px;
          padding: 1rem;
          font-size: 1.1rem;
          background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .start-diagnosis-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15);
        }
        .start-diagnosis-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .error-message {
          color: #ef4444;
          background: #fef2f2;
          padding: 0.75rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }
        .modal-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ai-result {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }
        .markdown-content {
          line-height: 1.7;
          color: #334155;
        }
        /* ... existing styles ... */
        .markdown-content h2 {
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content h3 {
          color: #475569;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .markdown-content ul {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content li {
          margin-bottom: 0.5rem;
        }
        .markdown-content p {
          margin-bottom: 1rem;
        }
        .markdown-content strong {
          color: #0f172a;
          background: #f1f5f9;
          padding: 0 4px;
          border-radius: 2px;
        }
        .result-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
          border-top: 1px solid #e2e8f0;
          padding-top: 1.5rem;
          padding-bottom: 1rem;
        }

        /* Progress Bar Styles */
        .loading-container {
            width: 100%;
            max-width: 400px;
            text-align: center;
            margin-top: 1rem;
        }
        .progress-bar-container {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 1rem;
            position: relative;
        }
        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            width: 0%;
            border-radius: 4px;
            animation: progressAnimation 2.5s cubic-bezier(0.1, 0.7, 1.0, 0.1) forwards;
        }
        @keyframes progressAnimation {
            0% { width: 0%; }
            30% { width: 40%; }
            70% { width: 80%; }
            95% { width: 95%; }
            /* Stays at 95% until real completion/render */
        }
        .loading-text {
            color: #6366f1;
            font-weight: bold;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
      `}</style>
    </div>
  );
}

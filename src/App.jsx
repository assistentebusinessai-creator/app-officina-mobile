import React, { useState, useEffect } from 'react';
import { Bell, Car, Clock, CheckCircle, AlertCircle, Mic, Phone, Search, Send, Menu, X, Volume2, MessageSquare, RefreshCw } from 'lucide-react';

// ==================== CONFIGURAZIONE ====================
// 🔧 IMPORTANTE: Sostituisci con l'URL del tuo backend Python su Replit
const API_URL = 'bot-whatsapp-backend-production.up.railway.app';

// Se stai testando in locale, usa:
// const API_URL = 'http://localhost:5000/api';

// ==================== APP TITOLARE OFFICINA ====================
const AppTitolare = () => {
  const [richieste, setRichieste] = useState([]);
  const [activeTab, setActiveTab] = useState('urgenze');
  const [notifiche, setNotifiche] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalRisposta, setModalRisposta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [audioMode, setAudioMode] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  // ==================== VERIFICA CONNESSIONE BACKEND ====================
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(API_URL.replace('/api', ''));
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('online');
        console.log('✅ Backend online:', data);
        return true;
      }
    } catch (err) {
      setBackendStatus('offline');
      console.error('❌ Backend offline:', err);
      return false;
    }
  };

  // ==================== CARICA RICHIESTE DAL BACKEND ====================
  const caricaRichieste = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/richieste`);
      
      if (!response.ok) {
        throw new Error('Errore caricamento richieste');
      }
      
      const data = await response.json();
      setRichieste(data);
      
      // Aggiorna badge urgenze non lette
      const urgenze = data.filter(r => r.categoria === 'URGENTE' && !r.letto);
      setBadgeCount(urgenze.length);
      
      // Mostra notifica per nuove urgenze
      urgenze.forEach(urgenza => {
        if (!notifiche.find(n => n.id === urgenza.id)) {
          mostraNotificaUrgenza(urgenza);
        }
      });
      
      console.log(`✅ Caricate ${data.length} richieste`);
      
    } catch (err) {
      console.error('❌ Errore caricamento:', err);
      setError('Impossibile caricare le richieste. Verifica che il backend sia online.');
      
      // Usa dati demo in caso di errore (per testing)
      usaDatiDemo();
    } finally {
      setLoading(false);
    }
  };

  // ==================== DATI DEMO (Fallback per testing) ====================
  const usaDatiDemo = () => {
    const richiesteDemo = [
      {
        id: 1,
        cliente: 'whatsapp:+393331234567',
        auto: 'BMW Serie 1',
        problema: 'Auto ferma / rumori strani',
        urgenza: 'Auto non parte',
        categoria: 'URGENTE',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        stato: 'nuova',
        letto: false
      },
      {
        id: 2,
        cliente: 'whatsapp:+393459876543',
        auto: 'Fiat Panda',
        problema: 'Tagliando / controllo',
        categoria: 'APPUNTAMENTO',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        stato: 'nuova',
        letto: false
      },
      {
        id: 3,
        cliente: 'whatsapp:+393205551234',
        auto: 'Audi A4',
        problema: 'Preventivo / informazioni',
        categoria: 'PREVENTIVO',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        stato: 'nuova',
        letto: false
      }
    ];
    
    setRichieste(richiesteDemo);
    setBadgeCount(1);
    console.log('⚠️ Usando dati demo (backend offline)');
  };

  // ==================== MOSTRA NOTIFICA URGENZA ====================
  const mostraNotificaUrgenza = (richiesta) => {
    const notifica = {
      id: richiesta.id,
      tipo: 'URGENTE',
      titolo: '🚨 URGENZA',
      messaggio: `${richiesta.auto} - ${richiesta.urgenza}`,
      timestamp: new Date()
    };
    
    setNotifiche(prev => {
      // Evita duplicati
      if (prev.find(n => n.id === richiesta.id)) return prev;
      return [notifica, ...prev];
    });
    
    // Vibrazione (se supportata)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    // Rimuovi notifica dopo 5 secondi
    setTimeout(() => {
      setNotifiche(prev => prev.filter(n => n.id !== richiesta.id));
    }, 5000);
  };

  // ==================== SEGNA COME LETTO ====================
  const segnaComeLetto = (id) => {
    setRichieste(prev => prev.map(r => 
      r.id === id ? { ...r, letto: true } : r
    ));
    
    const urgenze = richieste.filter(r => 
      r.categoria === 'URGENTE' && !r.letto && r.id !== id
    );
    setBadgeCount(urgenze.length);
  };

  // ==================== INVIA RISPOSTA AL BACKEND ====================
  const inviaRisposta = async (richiestaId, messaggio, tipo = 'template') => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/risposta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          richiesta_id: richiestaId,
          messaggio: messaggio
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore invio risposta');
      }
      
      const data = await response.json();
      
      // Aggiorna stato locale
      setRichieste(prev => prev.map(r => 
        r.id === richiestaId 
          ? { 
              ...r, 
              stato: 'risposta',
              risposta: messaggio,
              risposta_timestamp: new Date().toISOString(),
              tipoRisposta: tipo
            }
          : r
      ));
      
      setModalRisposta(null);
      setAudioMode(false);
      
      // Mostra conferma
      alert(`✅ Messaggio inviato al cliente via WhatsApp!\n\n${messaggio}`);
      
      console.log('✅ Risposta inviata:', data);
      
    } catch (err) {
      console.error('❌ Errore invio risposta:', err);
      alert('❌ Errore nell\'invio. Verifica che il backend sia online.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== COMPLETA RICHIESTA ====================
  const completaRichiesta = async (richiestaId) => {
    if (!confirm('Inviare messaggio di completamento al cliente?')) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/completa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          richiesta_id: richiestaId
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore completamento');
      }
      
      // Aggiorna stato locale
      setRichieste(prev => prev.map(r => 
        r.id === richiestaId 
          ? { ...r, stato: 'completata' }
          : r
      ));
      
      alert('✅ Messaggio di completamento inviato!');
      
    } catch (err) {
      console.error('❌ Errore completamento:', err);
      alert('❌ Errore. Verifica connessione backend.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== INIZIALIZZAZIONE ====================
  useEffect(() => {
    // Verifica backend all'avvio
    checkBackendStatus().then(online => {
      if (online) {
        caricaRichieste();
      } else {
        usaDatiDemo();
      }
    });
    
    // Auto-refresh ogni 30 secondi
    const interval = setInterval(() => {
      if (backendStatus === 'online') {
        caricaRichieste();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // ==================== FILTRI RICHIESTE ====================
  const urgenze = richieste.filter(r => r.categoria === 'URGENTE' && r.stato === 'nuova');
  const oggi = richieste.filter(r => ['APPUNTAMENTO', 'PREVENTIVO'].includes(r.categoria) && r.stato === 'nuova');
  const filteredClienti = richieste.filter(r => 
    r.auto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cliente.includes(searchTerm)
  );

  // ==================== TEMPLATE RISPOSTE ====================
  const templates = {
    appuntamento: "Ciao! Può portare l'auto domani alle 9:00? Conferma pure qui.",
    preventivo: "Preventivo indicativo €250 per il lavoro richiesto. Confermo in officina dopo controllo.",
    urgenza: "Arrivo tra 30 minuti per il soccorso. Aspetti lì.",
    completato: "🚗 La sua auto è pronta per il ritiro.\nGrazie per aver scelto la nostra officina!"
  };

  // ==================== RENDER ====================
  return (
    <div className="h-screen bg-gray-100 flex flex-col max-w-md mx-auto relative">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="w-7 h-7" />
            <div>
              <h1 className="text-lg font-bold">Officina App</h1>
              <div className="text-xs opacity-90 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                {backendStatus === 'online' ? 'Online' : 'Offline - Dati demo'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={caricaRichieste}
              disabled={loading}
              className="p-2 hover:bg-blue-800 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {badgeCount > 0 && (
              <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm animate-pulse">
                {badgeCount}
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-blue-800 rounded-lg">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* MENU LATERALE */}
      {menuOpen && (
        <div className="absolute top-16 right-0 bg-white shadow-xl rounded-bl-lg z-50 w-64">
          <div className="p-4 border-b">
            <div className="font-semibold">Mario Rossi</div>
            <div className="text-sm text-gray-500">Officina Auto</div>
          </div>
          <button 
            onClick={() => {
              alert(`Backend: ${API_URL}\nStato: ${backendStatus}\nRichieste: ${richieste.length}`);
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b"
          >
            ℹ️ Info Sistema
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b">
            ⚙️ Impostazioni
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b">
            📊 Statistiche
          </button>
        </div>
      )}

      {/* NOTIFICHE PUSH */}
      <div className="fixed top-20 left-0 right-0 z-50 px-4 space-y-2">
        {notifiche.slice(0, 1).map(n => (
          <div 
            key={n.id}
            onClick={() => {
              setActiveTab('urgenze');
              setNotifiche([]);
            }}
            className="bg-red-600 text-white rounded-lg shadow-2xl p-4 cursor-pointer transform transition hover:scale-105 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold">{n.titolo}</div>
                <div className="text-sm mt-1">{n.messaggio}</div>
                <div className="text-xs mt-2 opacity-90">Tocca per rispondere →</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ERRORE CONNESSIONE */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex bg-white shadow sticky top-16 z-30">
        <button
          onClick={() => setActiveTab('urgenze')}
          className={`flex-1 py-4 px-2 font-semibold text-sm relative ${
            activeTab === 'urgenze' ? 'bg-red-500 text-white' : 'text-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4" />
            URGENZE
          </div>
          {urgenze.length > 0 && (
            <div className="absolute top-1 right-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {urgenze.length}
            </div>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('oggi')}
          className={`flex-1 py-4 px-2 font-semibold text-sm relative ${
            activeTab === 'oggi' ? 'bg-blue-500 text-white' : 'text-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            OGGI
          </div>
          {oggi.length > 0 && (
            <div className="absolute top-1 right-1 bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {oggi.length}
            </div>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('clienti')}
          className={`flex-1 py-4 px-2 font-semibold text-sm ${
            activeTab === 'clienti' ? 'bg-green-500 text-white' : 'text-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <Search className="w-4 h-4" />
            CLIENTI
          </div>
        </button>
      </div>

      {/* CONTENUTO */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB URGENZE */}
        {activeTab === 'urgenze' && (
          <div className="p-4 space-y-3">
            {urgenze.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-3" />
                <div className="text-gray-500 font-medium">Nessuna urgenza</div>
                <div className="text-sm text-gray-400 mt-1">Tutto sotto controllo! 👍</div>
              </div>
            ) : (
              urgenze.map(r => (
                <div 
                  key={r.id}
                  onClick={() => segnaComeLetto(r.id)}
                  className={`bg-white rounded-xl shadow-lg border-l-4 ${
                    r.letto ? 'border-gray-300' : 'border-red-500'
                  } p-4 cursor-pointer hover:shadow-xl transition`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-lg">{r.auto}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <Phone className="w-3 h-3 inline mr-1" />
                        {r.cliente.replace('whatsapp:', '')}
                      </div>
                      <div className="bg-red-50 text-red-800 text-sm px-3 py-1 rounded-lg inline-block font-semibold">
                        🚨 {r.urgenza}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalRisposta(r);
                    }}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    RISPONDI ORA
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB OGGI */}
        {activeTab === 'oggi' && (
          <div className="p-4 space-y-3">
            {oggi.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <div className="text-gray-500">Nessuna richiesta oggi</div>
              </div>
            ) : (
              oggi.map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg mb-1">{r.auto}</div>
                      <div className="text-sm text-gray-600 mb-2">
                        {r.cliente.replace('whatsapp:', '')}
                      </div>
                      <div className={`text-sm px-3 py-1 rounded-lg inline-block ${
                        r.categoria === 'APPUNTAMENTO' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {r.categoria === 'APPUNTAMENTO' ? '📅 Appuntamento' : '💰 Preventivo'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setModalRisposta(r)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Rispondi
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CLIENTI */}
        {activeTab === 'clienti' && (
          <div className="p-4">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca auto o numero..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-3">
              {filteredClienti.map(r => (
                <div key={r.id} className="bg-white rounded-lg shadow p-4">
                  <div className="font-semibold text-lg mb-1">{r.auto}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    {r.cliente.replace('whatsapp:', '')}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(r.timestamp).toLocaleDateString('it-IT')} alle{' '}
                    {new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {r.risposta && (
                    <div className="mt-3 bg-green-50 border-l-4 border-green-500 p-3 text-sm">
                      <div className="font-semibold text-green-800 mb-1">✅ Risposta inviata:</div>
                      <div className="text-gray-700">{r.risposta}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL RISPOSTA */}
      {modalRisposta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{modalRisposta.auto}</h3>
                <div className="text-sm text-gray-600">
                  {modalRisposta.cliente.replace('whatsapp:', '')}
                </div>
              </div>
              <button 
                onClick={() => {
                  setModalRisposta(null);
                  setAudioMode(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="font-semibold mb-1">Richiesta:</div>
                <div className="text-gray-700">{modalRisposta.problema}</div>
                {modalRisposta.urgenza && (
                  <div className="text-red-600 font-semibold mt-1">🚨 {modalRisposta.urgenza}</div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-3">📝 Risposte rapide:</div>
                
                {modalRisposta.categoria === 'URGENTE' && (
                  <button
                    onClick={() => inviaRisposta(modalRisposta.id, templates.urgenza, 'template')}
                    disabled={loading}
                    className="w-full bg-red-100 hover:bg-red-200 p-4 rounded-xl text-left border-2 border-red-300 mb-2 disabled:opacity-50"
                  >
                    <div className="font-semibold text-red-800 mb-1">🚨 Soccorso immediato</div>
                    <div className="text-sm text-gray-700">{templates.urgenza}</div>
                  </button>
                )}
                
                {modalRisposta.categoria === 'APPUNTAMENTO' && (
                  <button
                    onClick={() => inviaRisposta(modalRisposta.id, templates.appuntamento, 'template')}
                    disabled={loading}
                    className="w-full bg-blue-100 hover:bg-blue-200 p-4 rounded-xl text-left border-2 border-blue-300 mb-2 disabled:opacity-50"
                  >
                    <div className="font-semibold text-blue-800 mb-1">📅 Proposta appuntamento</div>
                    <div className="text-sm text-gray-700">{templates.appuntamento}</div>
                  </button>
                )}
                
                {modalRisposta.categoria === 'PREVENTIVO' && (
                  <button
                    onClick={() => inviaRisposta(modalRisposta.id, templates.preventivo, 'template')}
                    disabled={loading}
                    className="w-full bg-green-100 hover:bg-green-200 p-4 rounded-xl text-left border-2 border-green-300 mb-2 disabled:opacity-50"
                  >
                    <div className="font-semibold text-green-800 mb-1">💰 Preventivo indicativo</div>
                    <div className="text-sm text-gray-700">{templates.preventivo}</div>
                  </button>
                )}
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={() => setAudioMode(!audioMode)}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 ${
                    audioMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                  }`}
                >
                  {audioMode ? (
                    <>
                      <Volume2 className="w-6 h-6 animate-pulse" />
                      🎙️ Registrando...
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6" />
                      Risposta Vocale
                    </>
                  )}
                </button>
                
                {audioMode && (
                  <div className="mt-4 bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                    <div className="text-center mb-3">
                      <div className="text-purple-800 font-semibold mb-2">🎙️ Parla ora</div>
                      <div className="text-sm text-gray-600">
                        Il messaggio verrà trascritto e inviato automaticamente
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const messaggioVocale = "Esempio: Ho controllato, può passare domani alle 14:00";
                          inviaRisposta(modalRisposta.id, messaggioVocale, 'vocale');
                        }}
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg disabled:opacity-50"
                      >
                        ✅ Invia
                      </button>
                      <button
                        onClick={() => setAudioMode(false)}
                        className="px-4 bg-gray-200 text-gray-700 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <div className="mt-2 text-sm text-gray-600">Caricamento...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppTitolare;
// DSH Bridge - Client UI Plugin
// Production-grade settings panel with real-time status and elegant design

import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc.js';

const name = 'dsh-bridge:client';

/**
 * RPC call wrapper with error handling
 */
async function callRpc(ctx, endpoint, payload = {}) {
  const connection = ctx.get('connection');
  if (!connection?.rpc?.call) {
    throw new Error('Connection RPC unavailable');
  }
  
  const result = await connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload);
  
  if (!result.ok) {
    const message = result.error?.message ?? 'Unknown error';
    throw new Error(message);
  }
  
  return result.value;
}

/**
 * Copy text to clipboard with fallback
 */
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Access method card component
 */
function AccessCard({ ctx, title, description, status, onStart, onStop, children }) {
  const React = ctx.get('react');
  const { running, configured, url, qr, state, activeConnections } = status;
  
  const canStart = configured !== false && !running;
  const canStop = running;
  
  return React.createElement('div', {
    style: {
      backgroundColor: '#FBF9F5',
      borderRadius: '12px',
      border: '1px solid #E7E1D7',
      padding: '24px',
      marginBottom: '24px',
      transition: 'all 0.3s ease',
    }
  },
    // Header
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }
    },
      React.createElement('div', null,
        React.createElement('h3', {
          style: {
            margin: '0 0 4px 0',
            fontSize: '20px',
            fontWeight: '500',
            color: '#1F2421',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }
        }, title),
        React.createElement('p', {
          style: {
            margin: 0,
            fontSize: '14px',
            color: '#5C635D',
            lineHeight: '1.5',
          }
        }, description)
      ),
      
      // Status badge
      running ? React.createElement('div', {
        style: {
          padding: '6px 12px',
          backgroundColor: '#C4612F',
          color: '#FFFFFF',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: '500',
        }
      }, 'Active') : null
    ),
    
    // Configuration warning
    configured === false ? React.createElement('div', {
      style: {
        padding: '12px 16px',
        backgroundColor: '#F2E3D6',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        color: '#5C635D',
      }
    }, '⚠️ Not configured - see instructions below') : null,
    
    // State message (starting, downloading, error, etc.)
    state && state.phase !== 'idle' && state.phase !== 'ready' ? React.createElement('div', {
      style: {
        padding: '12px 16px',
        backgroundColor: state.phase === 'error' ? '#F2E3D6' : '#F7F4EF',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        color: state.phase === 'error' ? '#C4612F' : '#5C635D',
      }
    },
      React.createElement('div', {
        style: { fontWeight: '500', marginBottom: '4px' }
      }, state.phase === 'error' ? 'Error' : state.phase === 'downloading' ? 'Downloading' : 'Connecting'),
      state.detail
    ) : null,
    
    // URL and QR code
    url ? React.createElement('div', {
      style: { marginBottom: '16px' }
    },
      qr ? React.createElement('img', {
        src: qr,
        alt: 'QR Code',
        style: {
          width: '200px',
          height: '200px',
          display: 'block',
          margin: '0 auto 16px auto',
          padding: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E7E1D7',
        }
      }) : null,
      
      React.createElement(UrlDisplay, { ctx, url, activeConnections })
    ) : null,
    
    // Custom content
    children,
    
    // Action buttons
    React.createElement('div', {
      style: {
        display: 'flex',
        gap: '12px',
        marginTop: '16px',
      }
    },
      canStart ? React.createElement('button', {
        onClick: onStart,
        disabled: !configured,
        style: {
          flex: 1,
          padding: '12px 24px',
          backgroundColor: configured ? '#C4612F' : '#E7E1D7',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '999px',
          cursor: configured ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s',
        },
        onMouseEnter: (e) => {
          if (configured) e.target.style.backgroundColor = '#A94E22';
        },
        onMouseLeave: (e) => {
          if (configured) e.target.style.backgroundColor = '#C4612F';
        }
      }, 'Start') : null,
      
      canStop ? React.createElement('button', {
        onClick: onStop,
        style: {
          flex: 1,
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          color: '#C4612F',
          border: '1px solid #C4612F',
          borderRadius: '999px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s',
        },
        onMouseEnter: (e) => {
          e.target.style.backgroundColor = '#F7F4EF';
        },
        onMouseLeave: (e) => {
          e.target.style.backgroundColor = '#FFFFFF';
        }
      }, 'Stop') : null
    )
  );
}

/**
 * URL display with copy button
 */
function UrlDisplay({ ctx, url, activeConnections }) {
  const React = ctx.get('react');
  const { useState } = React;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };
  
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid #E7E1D7',
    }
  },
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('code', {
        style: {
          fontSize: '13px',
          fontFamily: 'ui-monospace, monospace',
          color: '#1F2421',
          wordBreak: 'break-all',
        }
      }, url),
      
      activeConnections !== undefined ? React.createElement('div', {
        style: {
          fontSize: '12px',
          color: '#5C635D',
          marginTop: '4px',
        }
      }, `${activeConnections} active connection${activeConnections !== 1 ? 's' : ''}`) : null
    ),
    
    React.createElement('button', {
      onClick: handleCopy,
      style: {
        padding: '6px 14px',
        backgroundColor: copied ? '#C4612F' : '#FFFFFF',
        color: copied ? '#FFFFFF' : '#C4612F',
        border: copied ? 'none' : '1px solid #C4612F',
        borderRadius: '999px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }
    }, copied ? '✓ Copied' : 'Copy')
  );
}

/**
 * Main settings panel
 */
function BridgePanel({ ctx }) {
  const React = ctx.get('react');
  const { useState, useEffect } = React;
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState({});
  
  // Load status
  const loadStatus = async () => {
    try {
      const data = await callRpc(ctx, BRIDGE_ENDPOINTS.getStatus);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Auto-refresh every 3 seconds
  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 3000);
    return () => clearInterval(timer);
  }, []);
  
  // Action handler
  const handleAction = async (endpoint, key) => {
    setActionInProgress(prev => ({ ...prev, [key]: true }));
    try {
      await callRpc(ctx, endpoint);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(prev => ({ ...prev, [key]: false }));
    }
  };
  
  if (loading) {
    return React.createElement('div', {
      style: {
        padding: '40px',
        textAlign: 'center',
        color: '#5C635D',
      }
    }, 'Loading...');
  }
  
  return React.createElement('div', {
    style: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 24px',
    }
  },
    // Page header
    React.createElement('div', {
      style: { marginBottom: '40px' }
    },
      React.createElement('h1', {
        style: {
          margin: '0 0 8px 0',
          fontSize: '36px',
          fontWeight: '400',
          color: '#1F2421',
          fontFamily: 'Georgia, serif',
          letterSpacing: '-0.02em',
        }
      }, 'DSH ', React.createElement('em', { style: { color: '#C4612F' } }, 'Bridge')),
      
      React.createElement('p', {
        style: {
          margin: '0 0 8px 0',
          fontSize: '16px',
          color: '#5C635D',
          lineHeight: '1.6',
        }
      }, 'Multi-channel access bridge for remote tunnels and bot integrations'),
      
      status ? React.createElement('div', {
        style: {
          fontSize: '13px',
          color: '#5C635D',
          fontFamily: 'ui-monospace, monospace',
        }
      }, `v${status.version} • Proxy ${status.proxy.running ? 'running' : 'stopped'} on port ${status.proxy.port}`) : null
    ),
    
    // Global error
    error ? React.createElement('div', {
      style: {
        padding: '16px 20px',
        backgroundColor: '#F2E3D6',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#C4612F',
      }
    }, error) : null,
    
    // Access methods
    React.createElement(AccessCard, {
      ctx,
      title: 'LAN Access',
      description: 'Access from devices on the same Wi-Fi network',
      status: {
        running: status?.proxy.running,
        configured: status?.lan.ip !== null,
        url: status?.lan.url,
        qr: status?.lan.qr,
        activeConnections: status?.proxy.activeConnections,
      },
    }),
    
    React.createElement(AccessCard, {
      ctx,
      title: 'Cloudflare Tunnel',
      description: 'Quick public access via Cloudflare (URL changes on restart)',
      status: {
        running: status?.cloudflared.running,
        configured: true,
        url: status?.cloudflared.url,
        qr: status?.cloudflared.qr,
        state: status?.cloudflared.state,
      },
      onStart: () => handleAction(BRIDGE_ENDPOINTS.startCloudflared, 'cloudflared'),
      onStop: () => handleAction(BRIDGE_ENDPOINTS.stopCloudflared, 'cloudflared'),
    }),
    
    React.createElement(AccessCard, {
      ctx,
      title: 'Custom Server',
      description: 'Your own tunnel server with fixed domain',
      status: {
        running: status?.customTunnel.running,
        configured: status?.customTunnel.configured,
        url: status?.customTunnel.url,
        qr: status?.customTunnel.qr,
        state: status?.customTunnel.state,
      },
      onStart: () => handleAction(BRIDGE_ENDPOINTS.startCustomTunnel, 'customTunnel'),
      onStop: () => handleAction(BRIDGE_ENDPOINTS.stopCustomTunnel, 'customTunnel'),
    }),
    
    // Instructions
    React.createElement('div', {
      style: {
        marginTop: '40px',
        padding: '24px',
        backgroundColor: '#F7F4EF',
        borderRadius: '12px',
        fontSize: '14px',
        color: '#5C635D',
        lineHeight: '1.8',
      }
    },
      React.createElement('h3', {
        style: {
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '500',
          color: '#1F2421',
        }
      }, 'Configuration'),
      
      React.createElement('p', { style: { margin: '0 0 16px 0' } },
        'To configure custom server, add to your ',
        React.createElement('code', {
          style: {
            padding: '2px 6px',
            backgroundColor: '#FFFFFF',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
          }
        }, 'cordis.yml'),
        ':'
      ),
      
      React.createElement('pre', {
        style: {
          margin: '0 0 16px 0',
          padding: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E7E1D7',
          fontSize: '13px',
          fontFamily: 'ui-monospace, monospace',
          overflow: 'auto',
        }
      }, `plugins:
  dsh-bridge:
    customTunnel:
      serverUrl: wss://your-server.com
      accessToken: your-secret-token`),
      
      React.createElement('p', { style: { margin: '0' } },
        'Or use environment variables: ',
        React.createElement('code', {
          style: {
            padding: '2px 6px',
            backgroundColor: '#FFFFFF',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
          }
        }, 'DSH_BRIDGE_SERVER'),
        ' and ',
        React.createElement('code', {
          style: {
            padding: '2px 6px',
            backgroundColor: '#FFFFFF',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
          }
        }, 'DSH_BRIDGE_TOKEN')
      )
    )
  );
}

/**
 * Plugin entry point
 */
export function apply(ctx) {
  const React = ctx.get('react');
  if (!React) {
    console.warn('dsh-bridge:client - React unavailable');
    return;
  }
  
  // Register in settings
  const settings = ctx.get('settings');
  if (settings) {
    settings.register({
      id: 'dsh-bridge',
      label: 'DSH Bridge',
      order: 100,
      component: () => React.createElement(BridgePanel, { ctx }),
    });
  }
}

export { name };

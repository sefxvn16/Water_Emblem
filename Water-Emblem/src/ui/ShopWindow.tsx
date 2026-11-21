import React, { useState } from 'react';
import shoppingDialogues from '../../data/dialogues/shopping.json' with { type: 'json' };
import { getItemIcon } from './itemIcon';

export interface ShopStockRow {
  itemId: string;
  name: string;
  type: string;
  price: number;
  maxUses: number;
  /** Gold covers the price and the item fits (inventory or convoy). */
  canBuy: boolean;
}

export interface ShopSellRow {
  itemId: string;
  name: string;
  type: string;
  uses: number;
  maxUses: number;
  equipped: boolean;
  sellValue: number;
}

interface ShopWindowProps {
  /** Shop screen (PLAN item 91): click a stock row to buy it, click a
      held item to sell it. Closing the shop ends the unit's action. */
  unitName: string;
  gold: number;
  stock: readonly ShopStockRow[];
  sellItems: readonly ShopSellRow[];
  onBuy: (itemId: string) => void;
  onSell: (index: number) => void;
  onClose: () => void;
  shopType?: 'armory' | 'vendor' | 'secretShop';
}

export const ShopWindow: React.FC<ShopWindowProps> = (props) => {
  const shopData = shoppingDialogues[props.shopType ?? 'armory'] ?? shoppingDialogues.armory;
  const [speech, setSpeech] = useState<string>(() => `${shopData.welcome} ${shopData.buyPrompt}`);

  const handleBuy = (itemId: string) => {
    props.onBuy(itemId);
    setSpeech(shopData.continuePrompt);
  };

  const handleSell = (index: number) => {
    props.onSell(index);
    setSpeech(shopData.sellMorePrompt);
  };

  const headerStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#93c5fd',
    fontSize: '13px',
    padding: '4px 8px 6px',
    borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const rowStyle = (disabled: boolean, equipped = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '5px 8px',
    backgroundColor: equipped ? 'rgba(234, 179, 8, 0.14)' : 'transparent',
    border: 'none',
    color: disabled ? '#64748b' : '#ffffff',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: disabled ? 'default' : 'pointer',
    textAlign: 'left',
    textShadow: '1px 1px 0 #000',
    borderRadius: '4px',
  });

  const renderIcon = (itemId: string, type: string) => {
    const icon = getItemIcon(itemId, type);
    return icon ? (
      <img
        src={icon}
        alt=""
        style={{ width: '18px', height: '18px', imageRendering: 'pixelated', flexShrink: 0 }}
      />
    ) : null;
  };

  return (
    <div
      data-testid="shop-window"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '560px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1400,
        backgroundColor: '#0c1e5b',
        border: '2px solid #eab308',
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 8px',
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#93c5fd', fontSize: '14px' }}>Shop</span>
        <span style={{ fontWeight: 'bold', color: '#facc15', fontSize: '14px' }}>
          {props.gold.toLocaleString()} G
        </span>
      </div>
      <div
        data-testid="merchant-speech"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#071233',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '4px',
          padding: '6px 10px',
          color: '#fef08a',
          fontSize: '12px',
          fontStyle: 'italic',
        }}
      >
        <span style={{ fontSize: '14px', fontStyle: 'normal' }}>🏪</span>
        <span>{speech}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={headerStyle}>Buy</div>
          {props.stock.map((item) => (
            <button
              key={item.itemId}
              data-testid={`shop-buy-${item.itemId}`}
              disabled={!item.canBuy}
              onClick={() => handleBuy(item.itemId)}
              style={rowStyle(!item.canBuy)}
            >
              {renderIcon(item.itemId, item.type)}
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.maxUses} uses</span>
              <span style={{ fontSize: '12px', color: '#facc15' }}>{item.price.toLocaleString()} G</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={headerStyle}>{`Sell (${props.unitName})`}</div>
          {props.sellItems.length === 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 8px' }}>No items</div>
          )}
          {props.sellItems.map((item, index) => (
            <button
              key={`${item.itemId}-${index}`}
              data-testid={`shop-sell-${index}`}
              onClick={() => handleSell(index)}
              style={rowStyle(false, item.equipped)}
            >
              {renderIcon(item.itemId, item.type)}
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.uses}/{item.maxUses}</span>
              <span style={{ fontSize: '12px', color: '#facc15' }}>{item.sellValue.toLocaleString()} G</span>
            </button>
          ))}
        </div>
      </div>
      <button
        data-testid="shop-close"
        onClick={props.onClose}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fca5a5',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
          textShadow: '1px 1px 0 #000',
          borderRadius: '4px',
        }}
      >
        Done
      </button>
    </div>
  );
};

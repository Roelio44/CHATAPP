/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, X, Smile, User, Heart, PawPrint, Utensils, Trophy, Plane, Lightbulb } from 'lucide-react';

interface ComprehensiveEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  isReactionMode?: boolean;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
      '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
      '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
      '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
      '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ],
  },
  {
    id: 'people',
    name: 'People & Body',
    icon: User,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
      '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
      '👂', '🦻', '👃', '🫀', '🫁', '🧠', '👀', '👁️', '👅', '👄', '💋', '🫂', '👶',
      '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '👮', '🕵️',
      '💂', '🥷', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '👼', '🦸',
      '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🏃', '💃'
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
      '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏',
      '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚',
      '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲',
      '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
      '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔',
      '‼️', '⁉️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '❇️', '✳️', '❎', '🌐'
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: PawPrint,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣',
      '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋',
      '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍',
      '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪',
      '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐',
      '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁',
      '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌙',
      '⭐', '🌟', '✨', '⚡', '🔥', '🌈', '☀️', '🌤️', '⛅', '☁️', '🌧️', '❄️', '☃️'
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Utensils,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
      '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚',
      '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓',
      '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲',
      '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢',
      '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿',
      '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🧋', '🍶',
      '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: Trophy,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
      '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
      '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸',
      '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭',
      '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸',
      '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: Plane,
    emojis: [
      '🚗', '🚙', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🚎', '🚌',
      '🚐', '🚑', '🚒', '🚓', '🚕', '🛺', '🚆', '🚅', '🚄', '🚇', '🚈', '🚉', '🚊',
      '🚝', '🚞', '🚋', '✈️', '🛫', '🛬', '🛩️', '🚁', '🛰️', '🚀', '🛸', '🚢', '⛵',
      '🚤', '🛥️', '🛳️', '⛴️', '🛶', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽',
      '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '⛲', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️',
      '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏗️', '🏭', '🏢', '🏬', '🏥', '🏦', '🏨', '🏪',
      '🏫', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋'
    ],
  },
  {
    id: 'objects',
    name: 'Objects & Tools',
    icon: Lightbulb,
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📸', '📹', '🎥', '📽️',
      '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛',
      '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '💸', '💵', '💴', '💶', '💷',
      '🪙', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩',
      '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬',
      '🔮', '🧿', '💈', '⚗️', '🔭', '🔬', '🩹', '🩺', '💊', '💉', '🧬', '🧪', '🌡️',
      '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴',
      '🔑', '🗝️', '🚪', '🪑', '🛏️', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎉',
      '✉️', '📩', '📨', '📧', '💌', '📦', '🏷️', '📜', '📃', '📄', '📊', '📈', '📉',
      '🗒️', '🗓️', '📅', '🗑️', '📋', '📁', '📂', '📚', '📖', '🔖', '🧷', '🔗', '📎',
      '📌', '📍', '✂️', '🖊️', '🖋️', '📝', '✏️', '🔍', '🔎', '🔒', '🔓'
    ],
  },
];

export const ComprehensiveEmojiPicker: React.FC<ComprehensiveEmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  isReactionMode = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter emojis based on search
  const displayedEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
      return cat ? cat.emojis : EMOJI_CATEGORIES[0].emojis;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches: string[] = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((emoji) => {
        // Match either the emoji itself or category
        if (cat.name.toLowerCase().includes(q) || cat.id.includes(q)) {
          matches.push(emoji);
        }
      });
    });

    // If query didn't match category name, return all emojis as broad search
    if (matches.length === 0) {
      return EMOJI_CATEGORIES.flatMap((c) => c.emojis).slice(0, 80);
    }

    return Array.from(new Set(matches)).slice(0, 100);
  }, [activeCategory, searchQuery]);

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-80 sm:h-96 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header / Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search all emojis (heart, fire, laugh, food)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent transition-all"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close emoji picker"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs (visible when not searching) */}
      {!searchQuery && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar gap-1">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
                title={cat.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
          {searchQuery ? `Search Results (${displayedEmojis.length})` : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name}
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
          {displayedEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}_${idx}`}
              type="button"
              onClick={() => onSelectEmoji(emoji)}
              className="text-2xl p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-zinc-800 hover:scale-125 transition-all flex items-center justify-center cursor-pointer active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

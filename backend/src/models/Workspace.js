import mongoose from 'mongoose';

/**
 * A workspace groups an owner with the members they invite. Data stays isolated
 * per-user (each member sees only their own agents/leads/calls), while the API
 * keys are shared and drawn from the OWNER's account.
 */
// One connected external API key. `cipher` is AES-256-GCM ciphertext (never sent
// to the client); `last4` + `connectedAt` are display-only metadata.
const apiKeyField = {
  cipher: { type: String, default: '' },
  last4: { type: String, default: '' },
  connectedAt: { type: Date, default: null },
};

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Bring-your-own-keys: each workspace connects its own external API keys.
    // Features resolve THIS workspace's key — never another workspace's.
    apiKeys: {
      gemini: { ...apiKeyField, model: { type: String, default: '' } },
      serpapi: { ...apiKeyField },
      vapi: { ...apiKeyField },
    },
  },
  { timestamps: true },
);

export const Workspace = mongoose.model('Workspace', workspaceSchema);

import {
  Account,
  Asset,
  BASE_FEE,
  Memo,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export const DEFAULT_TESTNET_SOURCE_ACCOUNT =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
export const DEFAULT_TESTNET_RECIPIENT_ACCOUNT =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const DEFAULT_TESTNET_USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export interface BuildRemediationTransactionParams {
  verificationId?: string;
  sourceAccount?: string;
  recipientAccount?: string;
  requiredAmount: number;
  observedAmount: number;
  assetCode?: string;
  assetIssuer?: string;
  sequence?: string;
  networkPassphrase?: string;
  timeoutSeconds?: number;
}

export interface RemediationTransactionArtifact {
  unsignedXdr: string;
  laboratoryUrl: string;
  deficitAmount: number;
  formattedAmount: string;
  assetCode: string;
  assetIssuer?: string;
  sourceAccount: string;
  recipientAccount: string;
  memo: string;
  networkPassphrase: string;
}

function resolveValidPublicKey(candidate: string | undefined, fallback: string): string {
  if (candidate && StrKey.isValidEd25519PublicKey(candidate.trim())) {
    return candidate.trim();
  }
  return fallback;
}

export function formatRemediationMemo(verificationId = "pending"): string {
  const cleanId = verificationId.trim() || "pending";
  const fullMemo = `VeraOS:Fix:${cleanId}`;
  // Stellar Memo.text allows at most 28 UTF-8 bytes
  return Buffer.from(fullMemo, "utf8").subarray(0, 28).toString("utf8");
}

export function buildStellarAsset(
  assetCode = "USDC",
  assetIssuer?: string
): { asset: Asset; normalizedCode: string; resolvedIssuer?: string } {
  const code = assetCode.trim().toUpperCase() || "XLM";
  if (code === "XLM" || code === "NATIVE") {
    return { asset: Asset.native(), normalizedCode: "XLM" };
  }

  const issuer = resolveValidPublicKey(assetIssuer, DEFAULT_TESTNET_USDC_ISSUER);
  return {
    asset: new Asset(code, issuer),
    normalizedCode: code,
    resolvedIssuer: issuer,
  };
}

/**
 * Builds an unsigned Stellar remediation transaction envelope (base64 XDR)
 * transferring the exact deficit amount (requiredAmount - observedAmount)
 * to the target recipient address with a deterministic VeraOS:Fix:<verification_id> memo.
 */
export function buildRemediationTransaction(
  params: BuildRemediationTransactionParams
): RemediationTransactionArtifact {
  const required = Number.isFinite(params.requiredAmount) ? params.requiredAmount : 0;
  const observed = Number.isFinite(params.observedAmount) ? params.observedAmount : 0;
  const rawDeficit = Math.max(0, required - observed);
  // Ensure positive transfer amount (minimum 1 stroop if a corrective tx is requested)
  const deficitAmount = rawDeficit > 0 ? Number(rawDeficit.toFixed(7)) : Number(Math.max(required, 0.0000001).toFixed(7));
  const formattedAmount = deficitAmount.toFixed(7);

  const sourceAccount = resolveValidPublicKey(
    params.sourceAccount,
    DEFAULT_TESTNET_SOURCE_ACCOUNT
  );
  const recipientAccount = resolveValidPublicKey(
    params.recipientAccount,
    DEFAULT_TESTNET_RECIPIENT_ACCOUNT
  );
  const sequence = params.sequence || "0";
  const networkPassphrase =
    params.networkPassphrase || process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
  const timeoutSeconds = params.timeoutSeconds ?? 300;

  const { asset, normalizedCode, resolvedIssuer } = buildStellarAsset(
    params.assetCode || "USDC",
    params.assetIssuer
  );

  const memoText = formatRemediationMemo(params.verificationId);
  const account = new Account(sourceAccount, sequence);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: recipientAccount,
        asset,
        amount: formattedAmount,
      })
    )
    .addMemo(Memo.text(memoText))
    .setTimeout(timeoutSeconds)
    .build();

  const unsignedXdr = tx.toXDR();
  const laboratoryUrl = `https://laboratory.stellar.org/#txsigner?xdr=${encodeURIComponent(
    unsignedXdr
  )}`;

  return {
    unsignedXdr,
    laboratoryUrl,
    deficitAmount,
    formattedAmount,
    assetCode: normalizedCode,
    assetIssuer: resolvedIssuer,
    sourceAccount,
    recipientAccount,
    memo: memoText,
    networkPassphrase,
  };
}

/**
 * Bind reconciliation to the transaction returned by the broadcaster. A
 * caller-supplied hash may fill a missing broadcaster result, but cannot
 * replace a hash already bound to the broadcast attempt.
 */
export function bindSettlementTransactionHash(record: { txHash?: string }, suppliedTxHash?: string): string {
  if (suppliedTxHash !== undefined && !/^0x[0-9a-fA-F]{64}$/.test(suppliedTxHash)) {
    throw new Error("Settlement reconciliation requires a valid transaction hash");
  }
  if (record.txHash && suppliedTxHash && record.txHash.toLowerCase() !== suppliedTxHash.toLowerCase()) {
    throw new Error("Supplied transaction hash does not match the hash returned by the broadcaster");
  }
  const resolvedTxHash = record.txHash ?? suppliedTxHash;
  if (!resolvedTxHash) throw new Error("Supply the transaction hash returned by the wallet or network broadcaster");
  record.txHash = resolvedTxHash;
  return resolvedTxHash;
}

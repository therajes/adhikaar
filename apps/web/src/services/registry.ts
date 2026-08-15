import { createPublicClient, createWalletClient, decodeEventLog, http, keccak256, stringToHex, type Address, type Hex } from 'viem'
import { foundry } from 'viem/chains'

const address = (import.meta.env.VITE_REGISTRY_CONTRACT_ADDRESS ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3') as Address
const rpcUrl = import.meta.env.VITE_CHAIN_RPC_URL ?? 'http://127.0.0.1:8545'
const validators = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
] as const satisfies readonly Address[]

const abi = [
  { type: 'function', name: 'propose', stateMutability: 'nonpayable', inputs: [{ name: 'proposalType', type: 'uint8' }, { name: 'institutionIdHash', type: 'bytes32' }, { name: 'value', type: 'bytes32' }, { name: 'auxiliaryValue', type: 'bytes32' }], outputs: [{ name: 'proposalId', type: 'bytes32' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getInstitution', stateMutability: 'view', inputs: [{ name: 'institutionIdHash', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'active', type: 'bool' }, { name: 'revoked', type: 'bool' }, { name: 'publicKeyHash', type: 'bytes32' }, { name: 'metadataHash', type: 'bytes32' }, { name: 'currentPolicyRoot', type: 'bytes32' }, { name: 'currentRevocationRoot', type: 'bytes32' }, { name: 'currentSnapshotRoot', type: 'bytes32' }, { name: 'updatedBlock', type: 'uint64' }] }] },
  { type: 'event', name: 'ProposalCreated', inputs: [{ name: 'proposalId', type: 'bytes32', indexed: true }, { name: 'proposalType', type: 'uint8', indexed: true }, { name: 'institutionIdHash', type: 'bytes32', indexed: true }, { name: 'value', type: 'bytes32', indexed: false }, { name: 'auxiliaryValue', type: 'bytes32', indexed: false }] },
] as const

const institutionIdHash = keccak256(stringToHex('bharat-trust-bank-demo'))
const publicClient = createPublicClient({ chain: foundry, transport: http(rpcUrl) })

export interface RegistryStatus {
  reachable: boolean
  chainId?: number
  active: boolean
  revoked: boolean
  publicKeyHash: Hex
  updatedBlock: bigint
  contractAddress: Address
}

export async function getRegistryStatus(): Promise<RegistryStatus> {
  try {
    const [chainId, institution] = await Promise.all([
      publicClient.getChainId(),
      publicClient.readContract({ address, abi, functionName: 'getInstitution', args: [institutionIdHash] }),
    ])
    return { reachable: true, chainId, active: institution.active, revoked: institution.revoked, publicKeyHash: institution.publicKeyHash, updatedBlock: institution.updatedBlock, contractAddress: address }
  } catch {
    return { reachable: false, active: false, revoked: false, publicKeyHash: `0x${'0'.repeat(64)}`, updatedBlock: 0n, contractAddress: address }
  }
}

export async function runGovernedRegistration(progress: (message: string) => void): Promise<RegistryStatus> {
  const before = await getRegistryStatus()
  if (!before.reachable) throw new Error('Local Anvil is unavailable. Start the project with make dev.')
  if (before.active || before.publicKeyHash !== `0x${'0'.repeat(64)}`) {
    progress('The fictional institution is already registered on this Anvil chain.')
    return before
  }

  const wallets = validators.map(account => createWalletClient({ account, chain: foundry, transport: http(rpcUrl) }))
  progress('Validator 01 creates a hash-only registration proposal…')
  const proposalTransaction = await wallets[0]!.writeContract({ address, abi, functionName: 'propose', args: [0, institutionIdHash, keccak256(stringToHex('demo-public-key-v1')), keccak256(stringToHex('fictional-bank-metadata-v1'))] })
  const proposalReceipt = await publicClient.waitForTransactionReceipt({ hash: proposalTransaction })
  let proposalId: Hex | undefined
  for (const log of proposalReceipt.logs) {
    try {
      const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics })
      if (decoded.eventName === 'ProposalCreated') proposalId = decoded.args.proposalId
    } catch { /* unrelated log */ }
  }
  if (!proposalId) throw new Error('The proposal event was not found.')

  progress('Validator 01 records the first independent approval…')
  const firstApproval = await wallets[0]!.writeContract({ address, abi, functionName: 'approve', args: [proposalId] })
  await publicClient.waitForTransactionReceipt({ hash: firstApproval })
  progress('Validator 02 records the threshold approval…')
  const secondApproval = await wallets[1]!.writeContract({ address, abi, functionName: 'approve', args: [proposalId] })
  await publicClient.waitForTransactionReceipt({ hash: secondApproval })
  progress('Two-of-three threshold reached. Institution state executed on-chain.')
  return getRegistryStatus()
}

import sha256 from "sha256";
const currentNodeUrl = process.argv[3];
import { v1 } from "uuid";

function BlockChain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = [];
  this.createNewBlock(100, undefined, undefined);
}

BlockChain.prototype.createNewBlock = function(nonce, previousHash, hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce: nonce,
    hash: hash || 0,
    previousHash: previousHash || 0
  };

  this.pendingTransactions = [];
  this.chain.push(newBlock);
  return newBlock;
};

BlockChain.prototype.hashBlock = function(
  previousHash,
  currentBlockData,
  nonce
) {
  const dataAsString =
    previousHash + nonce.toString() + JSON.stringify(currentBlockData);
  const hash = sha256(dataAsString);
  return hash;
};

BlockChain.prototype.proofOfWork = function(previousHash, currentBlockData) {
  let nonce = 0;
  let hash = this.hashBlock(previousHash, currentBlockData, nonce);
  while (hash.substring(0, 4) !== "0000") {
    nonce++;
    hash = this.hashBlock(previousHash, currentBlockData, nonce);
  }
  return nonce;
};

BlockChain.prototype.getLastBlock = function() {
  return this.chain[this.chain.length - 1];
};

BlockChain.prototype.createNewTransaction = function(
  amount,
  sender,
  recipient
) {
  const newTransaction = {
    amount,
    sender,
    recipient,
    transactionId: v1()
      .split("-")
      .join("")
  };

  this.pendingTransactions.push(newTransaction);

  return this.getLastBlock()["index"] + 1;
};

BlockChain.prototype.addTransactionToPendingTransactions = function(
  transactionObj
) {
  this.pendingTransactions = [...transactionObj];
  return this.getLastBlock()["index"] + 1;
};

module.exports = BlockChain;

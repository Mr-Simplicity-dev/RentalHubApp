import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { marketingOpsService } from '../../services/marketingOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const EDITOR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 16px; color: #0f172a; }
  #e { min-height: 320px; padding: 10px; outline: none; }
</style>
</head>
<body>
<div id="e" contenteditable="true"></div>
<script>
  function post() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', html: document.getElementById('e').innerHTML }));
  }
  document.getElementById('e').addEventListener('input', post);
  window.__cmd = function (c) {
    document.execCommand(c, false, null);
    document.getElementById('e').focus();
    post();
  };
</script>
</body>
</html>`;

const COMMANDS = [
  { cmd: 'bold', label: 'B' },
  { cmd: 'italic', label: 'I' },
  { cmd: 'underline', label: 'U' },
  { cmd: 'insertUnorderedList', label: '•' },
  { cmd: 'insertOrderedList', label: '1.' },
];

const EmailTemplateEditorScreen = ({ navigation }) => {
  const webRef = useRef(null);
  const [tab, setTab] = useState('edit');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  const runCmd = (cmd) => {
    webRef.current?.injectJavaScript(`window.__cmd(${JSON.stringify(cmd)});`);
  };

  const save = async () => {
    if (!name.trim() || !subject.trim()) {
      Toast.show({ type: 'info', text1: 'Name and subject are required' });
      return;
    }
    setBusy(true);
    try {
      const res = await marketingOpsService.emailCreateTemplate({
        name: name.trim(),
        subject: subject.trim(),
        htmlContent: tab === 'source' ? source : html,
      });
      if (res?.success) {
        Toast.show({ type: 'success', text1: 'Template created' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Could not save', text2: res?.message || '' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err, 'Could not create the template') });
    } finally {
      setBusy(false);
    }
  };

  const toSource = () => {
    setSource(tab === 'edit' ? html : source);
    setTab('source');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PremiumHero
        eyebrow="Email templates"
        title="HTML template editor"
        subtitle="Compose rich email HTML, preview it, and save as a template."
        icon="color-wand-outline"
      />

      <PremiumCard>
        <Input label="Template name" value={name} onChangeText={setName} />
        <Input label="Subject" value={subject} onChangeText={setSubject} containerStyle={styles.fieldGap} />

        <View style={styles.tabRow}>
          {['edit', 'source', 'preview'].map((key) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => {
                if (key === 'source' && tab === 'edit') setSource(html);
                setTab(key);
              }}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <AppText style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {key === 'edit' ? 'Editor' : key === 'source' ? 'HTML' : 'Preview'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'edit' ? (
          <View style={styles.editorWrap}>
            <View style={styles.toolbar}>
              {COMMANDS.map((c) => (
                <TouchableOpacity key={c.cmd} activeOpacity={0.8} style={styles.tool} onPress={() => runCmd(c.cmd)}>
                  <AppText style={styles.toolText}>{c.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <WebView
              ref={webRef}
              originWhitelist={['*']}
              source={{ html: EDITOR_HTML }}
              onMessage={(e) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  if (data.type === 'html') setHtml(data.html);
                } catch {
                  // ignore malformed messages
                }
              }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        ) : null}

        {tab === 'source' ? (
          <TextInput
            style={styles.source}
            multiline
            value={source}
            onChangeText={setSource}
            placeholder="<p>Your HTML here…</p>"
            textAlignVertical="top"
          />
        ) : null}

        {tab === 'preview' ? (
          <View style={styles.editorWrap}>
            <WebView
              originWhitelist={['*']}
              source={{ html: html || '<p style="font-family:sans-serif;color:#94a3b8;">Nothing to preview yet.</p>' }}
              style={styles.webview}
              javaScriptEnabled
            />
          </View>
        ) : null}

        {tab === 'source' ? (
          <PremiumButton
            title="Preview this HTML"
            onPress={() => {
              setHtml(source);
              setTab('preview');
            }}
            variant="secondary"
            style={styles.action}
          />
        ) : null}

        <PremiumButton title="Save template" onPress={save} loading={busy} icon="checkmark-circle-outline" style={styles.action} />
      </PremiumCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  fieldGap: { marginTop: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8 },
  tab: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { color: colors.text, fontFamily: typography.semibold, fontSize: 13 },
  tabTextActive: { color: colors.white },
  editorWrap: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: '#f1f5f9',
  },
  tool: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  toolText: { color: colors.ink, fontFamily: typography.bold, fontSize: 15 },
  webview: { height: 340, backgroundColor: colors.white },
  source: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'monospace',
    fontSize: 13,
    height: 340,
    padding: 10,
    marginTop: 4,
  },
  action: { marginTop: 16 },
});

export default EmailTemplateEditorScreen;

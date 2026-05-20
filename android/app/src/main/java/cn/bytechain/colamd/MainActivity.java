package cn.bytechain.colamd;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

/**
 * 主活动类，继承自 Capacitor 的 BridgeActivity。
 * 支持 IME 中文输入、文件管理器打开文件、原生 PDF 打印。
 * 使用 JavascriptInterface 替代 Capacitor Plugin 实现更可靠的 JS-原生桥接。
 */
public class MainActivity extends BridgeActivity {

    private String pendingFileName = null;
    private String pendingFileContent = null;

    /**
     * 活动创建时的初始化方法。
     *
     * @param savedInstanceState 保存的实例状态
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // ── Critical for Android IME (Chinese/Japanese/Korean input) ──
            // TEXT_AUTOSIZING is deprecated and interferes with text measurement
            // during IME composition, breaking CJK input on contenteditable.
            settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);

            // Disable zoom controls — they interfere with touch event handling
            // for contenteditable IME on some Android versions.
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // Viewport setup for mobile editor layout
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            // Let the WebView handle its own IME focus for contenteditable.
            // Explicitly requesting focus ensures the WebView is ready for input.
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();

            // 注入 Java 桥接对象，供 JS 调用原生功能
            webView.addJavascriptInterface(new ColaMDNativeBridge(), "ColaMDNative");
        }

        if (savedInstanceState == null) {
            handleIntent(getIntent());
        }
    }

    /**
     * 处理新 Intent（singleTask 下再次打开文件时触发）。
     */
    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /**
     * 解析 Intent 中的文件数据并缓存。
     */
    private void handleIntent(android.content.Intent intent) {
        if (intent == null || !android.content.Intent.ACTION_VIEW.equals(intent.getAction())) return;

        android.net.Uri uri = intent.getData();
        if (uri == null) return;

        try {
            String content = readContentFromUri(uri);
            if (content != null && !content.isEmpty()) {
                pendingFileName = getFileName(uri);
                pendingFileContent = content;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 从 content URI 读取文件文本内容（UTF-8）。
     */
    private String readContentFromUri(android.net.Uri uri) {
        StringBuilder sb = new StringBuilder();
        try (InputStream is = getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 从 URI 中提取文件名。
     */
    private String getFileName(android.net.Uri uri) {
        String name = "document.md";
        if ("content".equals(uri.getScheme())) {
            try (android.database.Cursor cursor = getContentResolver().query(
                    uri, new String[]{android.provider.OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) name = cursor.getString(idx);
                }
            } catch (Exception e) { /* ignore */ }
        }
        return name;
    }

    /**
 * JS-原生桥接类，暴露给 WebView 的原生能力。
     * JS 通过 window.ColaMDNative.{method}() 调用。
     */
    public class ColaMDNativeBridge {

        /** JS 主动调用检查是否有待打开的文件 */
        @JavascriptInterface
        public String checkPendingFile() {
            if (pendingFileName != null && pendingFileContent != null) {
                String name = pendingFileName;
                String content = pendingFileContent;
                pendingFileName = null;
                pendingFileContent = null;
                // 返回 JSON，JS 端解析
                String escapedName = name.replace("\\", "\\\\").replace("\"", "\\\"");
                String escapedContent = content.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
                return "{\"name\":\"" + escapedName + "\",\"content\":\"" + escapedContent + "\"}";
            }
            return "null";
        }

        /** 调用系统打印对话框（含"保存为PDF"选项） */
        @JavascriptInterface
        public void printDocument(final String jobName) {
            runOnUiThread(() -> {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv == null) return;

                    PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = wv.createPrintDocumentAdapter(
                            jobName != null && !jobName.isEmpty() ? jobName : "ColaMD Document");
                    pm.print(jobName, adapter, new PrintAttributes.Builder().build());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }
}
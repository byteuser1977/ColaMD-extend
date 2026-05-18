package cn.bytechain.colamd;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;

/**
 * 主活动类，继承自 Capacitor 的 BridgeActivity。
 * 针对 Android WebView 的中文输入法 (IME) 兼容性进行了特殊处理。
 * 支持通过 Intent 打开 Markdown 文件。
 */
public class MainActivity extends BridgeActivity {

    private Uri pendingFileUri = null;

    /**
     * 活动创建时的初始化方法。
     * 配置 WebView 以支持中文输入法的正常工作。
     *
     * @param savedInstanceState 保存的实例状态
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri uri = intent.getData();
            if (uri != null) {
                pendingFileUri = uri;
            }
        }

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);

            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);

            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);

            setupIMEFocus(webView);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri uri = intent.getData();
            if (uri != null) {
                handleFileUri(uri);
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (pendingFileUri != null) {
            handleFileUri(pendingFileUri);
            pendingFileUri = null;
        }
    }

    /**
     * 处理从 Intent 接收到的文件 URI。
     * 读取文件内容并通过 JavaScript 传递给 WebView。
     *
     * @param uri 文件的 content:// URI
     */
    private void handleFileUri(Uri uri) {
        try {
            InputStream inputStream = getContentResolver().openInputStream(uri);
            if (inputStream == null) return;

            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"));
            StringBuilder stringBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                stringBuilder.append(line).append("\n");
            }
            reader.close();
            inputStream.close();

            String content = stringBuilder.toString();
            String fileName = getFileNameFromUri(uri);

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                final String jsCode = String.format(
                    "window.dispatchEvent(new CustomEvent('intent-file-opened', {detail: {path: '%s', content: %s}}));",
                    escapeJsString(fileName),
                    escapeJsString(content)
                );
                webView.post(() -> webView.evaluateJavascript(jsCode, null));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 从 URI 中提取文件名。
     *
     * @param uri 文件 URI
     * @return 文件名
     */
    private String getFileNameFromUri(Uri uri) {
        String fileName = "untitled.md";
        String path = uri.getPath();
        if (path != null) {
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                fileName = path.substring(lastSlash + 1);
            }
        }
        return fileName;
    }

    /**
     * 转义 JavaScript 字符串中的特殊字符。
     *
     * @param str 原始字符串
     * @return 转义后的字符串
     */
    private String escapeJsString(String str) {
        if (str == null) return "''";
        StringBuilder sb = new StringBuilder();
        sb.append("'");
        for (int i = 0; i < str.length(); i++) {
            char c = str.charAt(i);
            switch (c) {
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\'':
                    sb.append("\\'");
                    break;
                case '"':
                    sb.append("\\\"");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    sb.append(c);
            }
        }
        sb.append("'");
        return sb.toString();
    }

    /**
     * 设置 WebView 的 IME 焦点处理。
     * 解决 Android WebView 中文输入法无法正常输入的问题。
     *
     * @param webView 需要配置的 WebView 实例
     */
    private void setupIMEFocus(WebView webView) {
        webView.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                if (hasFocus) {
                    android.view.inputmethod.InputMethodManager imm =
                        (android.view.inputmethod.InputMethodManager)
                        getSystemService(INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.showSoftInput(v, 0);
                    }
                }
            }
        });
    }
}

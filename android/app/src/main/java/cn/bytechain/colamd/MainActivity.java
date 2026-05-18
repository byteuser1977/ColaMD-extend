package cn.bytechain.colamd;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;

/**
 * 主活动类，继承自 Capacitor 的 BridgeActivity。
 * 支持 IME 中文输入、文件管理器打开 .md 文件、原生 PDF 打印。
 */
public class MainActivity extends BridgeActivity {

    /**
     * 活动创建时的初始化方法。
     *
     * @param savedInstanceState 保存的实例状态
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ColamdPrintPlugin.class);
        super.onCreate(savedInstanceState);

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

        if (savedInstanceState == null) {
            handleIntent(getIntent());
        }
    }

    /**
     * 处理新 Intent（singleTask 模式下再次打开文件时触发）。
     */
    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /**
     * 解析 Intent 中的文件数据，读取内容并通过 JS 事件传递给前端。
     */
    private void handleIntent(android.content.Intent intent) {
        if (intent == null || !android.content.Intent.ACTION_VIEW.equals(intent.getAction())) return;

        android.net.Uri uri = intent.getData();
        if (uri == null) return;

        try {
            String content = readContentFromUri(uri);
            if (content != null && !content.isEmpty()) {
                String fileName = getFileName(uri);
                sendFileToJS(fileName, content);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 从 content URI 读取文件文本内容。
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
     * 通过 WebView 执行 JS 将文件内容传递给前端。
     */
    private void sendFileToJS(String fileName, String content) {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        String escapedContent = content
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        String js = String.format(
                "setTimeout(function(){ window.dispatchEvent(new CustomEvent('colamd-open-file',{detail:{name:'%s',content:'%s'}})); }, 500);",
                fileName.replace("'", "\\'"),
                escapedContent.replace("'", "\\'")
        );

        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    /**
     * 设置 WebView 的 IME 焦点处理。
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

    /**
     * Capacitor 插件：调用 Android 原生 PrintManager 打印 WebView 内容。
     * 用户可在打印对话框中选择"保存为 PDF"来生成真正的 PDF 文件。
     */
    @CapacitorPlugin(name = "ColamdPrint")
    public static class ColamdPrintPlugin extends Plugin {

        /**
         * 调用系统打印对话框，打印当前 WebView 内容。
         * Android 打印对话框自带"保存为 PDF"选项。
         *
         * @param call Capacitor 插件调用
         */
        @PluginMethod
        public void print(PluginCall call) {
            try {
                WebView webView = getBridge().getWebView();
                if (webView == null) {
                    call.reject("WebView not available");
                    return;
                }

                String jobName = "ColaMD Document";
                PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);

                printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());

                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Print failed: " + e.getMessage());
            }
        }
    }
}

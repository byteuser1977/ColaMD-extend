package cn.bytechain.colamd;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.InputStreamReader;

/**
 * 主活动类，继承自 Capacitor 的 BridgeActivity。
 * 支持 IME 中文输入、文件管理器打开文件、原生 PDF 打印。
 * 使用 JavascriptInterface 替代 Capacitor Plugin 实现更可靠的 JS-原生桥接。
 */
public class MainActivity extends BridgeActivity {

    private static final String LOG_TAG = "ColaMD";

    // JS 桥方法在 JavaBridge 线程上执行，UI 线程写入的字段必须 volatile，
    // 否则 release 包里 JIT 可能让桥线程一直读到旧值（暂存的文件取不出来）。
    private volatile String pendingFileName = null;
    private volatile String pendingFileContent = null;

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

        // Capacitor 的 BridgeActivity.load() 会在 super.onCreate 里回调 onNewIntent，
        // 这里再取一次：页面加载、进程被回收后重建这两种情况下都能拿到启动 Intent。
        handleIntent(getIntent());
    }

    /**
     * 处理新 Intent（singleTask 下再次打开文件时触发）。
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /**
     * 解析 Intent 中的文件数据并缓存。
     */
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        // 文件管理器普遍用 ACTION_VIEW + data 打开；也有走 ACTION_SEND + EXTRA_STREAM
        // 的（"分享到"），两种都把 URI 当文件读，内容一样。
        android.net.Uri uri = null;
        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
            if (uri == null) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else if (Intent.ACTION_SEND.equals(action)) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }
        if (uri == null) {
            Log.i(LOG_TAG, "handleIntent ignored, action=" + action);
            return;
        }

        try {
            String content = readContentFromUri(uri);
            if (content != null) {
                pendingFileName = getFileName(uri);
                pendingFileContent = content;
                Log.i(LOG_TAG, "handleIntent cached " + pendingFileName + " (" + content.length() + " chars)");
            } else {
                Log.w(LOG_TAG, "handleIntent: could not read " + uri);
            }
        } catch (Exception e) {
            Log.w(LOG_TAG, "handleIntent failed for " + uri, e);
        }
    }

    /**
     * 从 content URI 读取文件文本内容（UTF-8）。
     * 按字符流原样读回，不用 readLine：后者会给没有行尾换行的文件补一个 \n，
     * 用户下次保存时文件就被改动了。
     */
    private String readContentFromUri(android.net.Uri uri) {
        StringBuilder sb = new StringBuilder();
        try (InputStream is = getContentResolver().openInputStream(uri);
             InputStreamReader reader = new InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8)) {
            char[] buffer = new char[8192];
            int count;
            while ((count = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, count);
            }
            return sb.toString();
        } catch (Exception e) {
            Log.w(LOG_TAG, "readContentFromUri failed", e);
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
                    String displayName = idx >= 0 ? cursor.getString(idx) : null;
                    if (displayName != null && !displayName.isEmpty()) name = displayName;
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
        public synchronized String checkPendingFile() {
            if (pendingFileName == null || pendingFileContent == null) return "null";
            String name = pendingFileName;
            String content = pendingFileContent;
            pendingFileName = null;
            pendingFileContent = null;
            try {
                // 用 JSONObject 序列化：手拼字符串不会转义制表符等控制字符，
                // 文件里只要有一个 tab，JSON.parse 就会失败，整篇内容被丢掉。
                JSONObject payload = new JSONObject();
                payload.put("name", name);
                payload.put("content", content);
                String json = payload.toString();
                Log.i(LOG_TAG, "checkPendingFile delivered " + name + " (" + content.length() + " chars)");
                return json;
            } catch (Exception e) {
                Log.w(LOG_TAG, "checkPendingFile could not serialise payload", e);
                return "null";
            }
        }

        /** 渲染层日志 / 错误转发到 logcat：release 包没有控制台。 */
        @JavascriptInterface
        public void log(String message) {
            Log.e(LOG_TAG, message == null ? "null" : message);
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

        /**
         * 静默打印说明：PrintDocumentAdapter 的 LayoutResultCallback/WriteResultCallback
         * 构造器是 framework 私有的，SDK 层无法直接 onLayout/onWrite 落盘 PDF——
         * 该路线编译不过（2026-10-23 实测）。静默出 PDF 的可行方案是无头 WebView
         * 全高布局 + PdfDocument 直绘（无对话框、矢量无页数限制），留待阶段 2。
         * 当前长图导出（exportImage）在 JS 侧因能力检测自动降级为不可用。
         */
    }
}
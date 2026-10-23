package cn.bytechain.colamd;

import android.content.Context;
import android.os.Bundle;
import android.print.PageRange;
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

        /**
         * 静默打印：不弹系统对话框，把 WebView 当前内容直接写成 PDF 文件。
         * 完成后回调 window.__colamdNativeResult('printToFile', {ok, path})。
         * 长图导出（pdfToImage）的第一步：PDF 分页交给 Chromium 打印管线。
         */
        @JavascriptInterface
        public void printToFile(final String jobName) {
            new Thread(() -> {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv == null) { notifyJs("printToFile", "{\"ok\":false}"); return; }

                    java.io.File out = new java.io.File(getCacheDir(), "colamd-print.pdf");
                    android.os.ParcelFileDescriptor fd = android.os.ParcelFileDescriptor.open(out,
                            android.os.ParcelFileDescriptor.MODE_READ_WRITE
                                    | android.os.ParcelFileDescriptor.MODE_CREATE
                                    | android.os.ParcelFileDescriptor.MODE_TRUNCATE);
                    PrintAttributes attrs = new PrintAttributes.Builder().build();
                    PrintDocumentAdapter adapter = wv.createPrintDocumentAdapter(
                            jobName != null && !jobName.isEmpty() ? jobName : "ColaMD Document");
                    adapter.onLayout(null, attrs, null, new PrintDocumentAdapter.LayoutResultCallback() {
                        @Override
                        public void onLayoutFinished(android.print.PrintDocumentInfo info, boolean changed) {
                            try {
                                adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES},
                                        fd, null, new PrintDocumentAdapter.WriteResultCallback() {
                                            @Override
                                            public void onWriteFinished(PageRange[] pages) {
                                                notifyJs("printToFile", "{\"ok\":true,\"path\":\"" + escapeJson(out.getAbsolutePath()) + "\"}");
                                            }

                                            @Override
                                            public void onWriteFailed(CharSequence error) {
                                                notifyJs("printToFile", "{\"ok\":false}");
                                            }
                                        });
                            } catch (Exception e) {
                                e.printStackTrace();
                                notifyJs("printToFile", "{\"ok\":false}");
                            }
                        }

                        @Override
                        public void onLayoutFailed(CharSequence error) {
                            notifyJs("printToFile", "{\"ok\":false}");
                        }
                    }, null);
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyJs("printToFile", "{\"ok\":false}");
                }
            }).start();
        }

        /**
         * 把 PDF 渲染成一张纵向拼接的 PNG 长图。
         * scale 是清晰度倍率（1=72dpi 基准）。Bitmap 单维上限 32767px，
         * 页数多时自动降 scale 换取整图不溢出；超长文档清晰度会退化。
         * 完成后回调 window.__colamdNativeResult('pdfToImage', {ok, path})。
         */
        @JavascriptInterface
        public void pdfToImage(final String pdfPath, final String outPath, final float scale) {
            new Thread(() -> {
                try {
                    android.os.ParcelFileDescriptor fd = android.os.ParcelFileDescriptor.open(
                            new java.io.File(pdfPath), android.os.ParcelFileDescriptor.MODE_READ_ONLY);
                    android.graphics.pdf.PdfRenderer renderer = new android.graphics.pdf.PdfRenderer(fd);
                    int pageCount = renderer.getPageCount();
                    if (pageCount < 1 || pageCount > 60) {
                        renderer.close();
                        notifyJs("pdfToImage", "{\"ok\":false,\"error\":\"page-count\"}");
                        return;
                    }

                    android.graphics.pdf.PdfRenderer.Page probe = renderer.openPage(0);
                    float pageW = probe.getWidth();
                    float pageH = probe.getHeight();
                    probe.close();

                    // Bitmap 单维 ≤32767px：按页数压 scale，保证整图不溢出
                    float fit = 32000f / (pageH * pageCount);
                    float s = Math.min(Math.max(scale, 1f), Math.max(fit, 1f));
                    int w = Math.round(pageW * s);
                    int h = Math.round(pageH * s);

                    android.graphics.Bitmap joined = android.graphics.Bitmap.createBitmap(
                            w, h * pageCount, android.graphics.Bitmap.Config.ARGB_8888);
                    android.graphics.Canvas canvas = new android.graphics.Canvas(joined);
                    canvas.drawColor(android.graphics.Color.WHITE);
                    for (int i = 0; i < pageCount; i++) {
                        android.graphics.pdf.PdfRenderer.Page page = renderer.openPage(i);
                        android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(
                                w, h, android.graphics.Bitmap.Config.ARGB_8888);
                        bmp.eraseColor(android.graphics.Color.WHITE);
                        page.render(bmp, null, null, android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                        canvas.drawBitmap(bmp, 0, i * h, null);
                        bmp.recycle();
                        page.close();
                    }
                    renderer.close();
                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(outPath)) {
                        joined.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, fos);
                    }
                    joined.recycle();
                    notifyJs("pdfToImage", "{\"ok\":true,\"path\":\"" + escapeJson(outPath) + "\"}");
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyJs("pdfToImage", "{\"ok\":false}");
                }
            }).start();
        }

        /** 把结果回调给 JS：window.__colamdNativeResult(tag, payload) */
        private void notifyJs(String tag, String json) {
            WebView wv = getBridge().getWebView();
            if (wv == null) return;
            String script = "window.__colamdNativeResult && window.__colamdNativeResult('" + tag + "'," + json + ")";
            runOnUiThread(() -> wv.evaluateJavascript(script, null));
        }

        private static String escapeJson(String s) {
            return s.replace("\\", "\\\\").replace("\"", "\\\"");
        }
    }
}
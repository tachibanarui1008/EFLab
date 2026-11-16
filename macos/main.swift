import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let windowRect = NSRect(x: 100, y: 100, width: 1200, height: 860)
        window = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "EFLab Alpha 0.1 - 宏观经济实验模拟器"
        window.minSize = NSSize(width: 900, height: 650)
        window.delegate = self

        // 配置 WebKit 允许读取本地 HTML5 资源与 ES 模块
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        window.contentView!.addSubview(webView)

        // 读取 Bundle 内 Resources/app/index.html
        if let bundleAppPath = Bundle.main.resourcePath?.appending("/app/index.html"),
           FileManager.default.fileExists(atPath: bundleAppPath) {
            let appUrl = URL(fileURLWithPath: bundleAppPath)
            let readAccessUrl = URL(fileURLWithPath: Bundle.main.resourcePath!.appending("/app"))
            webView.loadFileURL(appUrl, allowingReadAccessTo: readAccessUrl)
        } else {
            // 开发备选：若未打包则直接读取源码根目录 index.html
            let devUrl = URL(fileURLWithPath: FileManager.default.currentDirectoryPath.appending("/index.html"))
            webView.loadFileURL(devUrl, allowingReadAccessTo: URL(fileURLWithPath: FileManager.default.currentDirectoryPath))
        }

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()

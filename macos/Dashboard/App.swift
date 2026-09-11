import SwiftUI
import WidgetKit

/* The host app exists because a widget extension must be embedded in one.
   It stays deliberately thin: open the dashboard, or force the widgets to
   refresh when you want to see a change immediately. */

@main
struct DashboardApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
                .frame(minWidth: 380, maxWidth: 460, minHeight: 300, maxHeight: 400)
        }
        .windowResizability(.contentSize)
    }
}

struct HomeView: View {
    @State private var status = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("A Level Dashboard")
                .font(.system(size: 17, weight: .semibold))
            Text("The widgets live in Notification Centre and on the desktop.\nRight-click the desktop → Edit Widgets, then search for “A Level”.")
                .font(.system(size: 12)).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Divider()

            Button("Open the dashboard") {
                if let u = URL(string: Config.baseURL) { NSWorkspace.shared.open(u) }
            }
            Button("Refresh the widgets now") {
                WidgetCenter.shared.reloadAllTimelines()
                status = "Asked WidgetKit to reload."
            }
            Button("Test the connection") {
                status = "Checking…"
                Task {
                    do {
                        let f = try await FeedLoader.load()
                        status = "Connected — \(f.homework.count) open, \(f.month.label)."
                    } catch {
                        status = error.localizedDescription
                    }
                }
            }

            if !status.isEmpty {
                Text(status).font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

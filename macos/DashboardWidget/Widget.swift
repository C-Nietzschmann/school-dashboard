import WidgetKit
import SwiftUI

struct Entry: TimelineEntry {
    let date: Date
    let feed: Feed?
    let error: String?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), feed: nil, error: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        Task {
            let feed = try? await FeedLoader.load()
            completion(Entry(date: Date(), feed: feed, error: nil))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        Task {
            var entry: Entry
            do {
                entry = Entry(date: Date(), feed: try await FeedLoader.load(), error: nil)
            } catch {
                entry = Entry(date: Date(), feed: nil, error: error.localizedDescription)
            }
            // One entry now, then one at each remaining period boundary today, so
            // the live bar advances and the "now / next" line stays right without
            // hitting the server again. Refetch after the last of them.
            var entries = [entry]
            let cal = Calendar.current
            let start = cal.startOfDay(for: Date())
            if let feed = entry.feed {
                var marks: [Int] = []
                for p in feed.periods {
                    if let s = Feed.Lesson.minutes(p.start) { marks.append(s) }
                    if let e = Feed.Lesson.minutes(p.end) { marks.append(e) }
                }
                // every five minutes inside a lesson keeps the bar visibly moving
                for l in feed.todayLessons {
                    guard let s = l.startMin, let e = l.endMin else { continue }
                    marks.append(contentsOf: stride(from: s, to: e, by: 5))
                }
                let nowMin = cal.component(.hour, from: Date()) * 60 + cal.component(.minute, from: Date())
                for m in Set(marks).sorted() where m > nowMin {
                    if let d = cal.date(byAdding: .minute, value: m, to: start) {
                        entries.append(Entry(date: d, feed: feed, error: nil))
                    }
                }
            }
            // Always refresh at the start of tomorrow, or a widget whose last
            // period has passed keeps showing yesterday's lessons overnight.
            let tomorrow = cal.date(byAdding: .day, value: 1, to: start) ?? Date()
            let afterLast = cal.date(byAdding: .minute, value: 30, to: entries.last?.date ?? Date()) ?? Date()
            let refetch = min(tomorrow, max(afterLast, Date().addingTimeInterval(900)))
            completion(Timeline(entries: entries, policy: .after(refetch)))
        }
    }
}

@main
struct DashboardWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        DeadlinesWidget()
        MonthWidget()
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.aleveldashboard.today", provider: Provider()) { entry in
            TodayView(entry: entry)
                .containerBackground(for: .widget) { Color.widgetBG }
        }
        .configurationDisplayName("Today")
        .description("Today's lessons, with a live bar through the one you are in.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct DeadlinesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.aleveldashboard.deadlines", provider: Provider()) { entry in
            DeadlinesView(entry: entry)
                .containerBackground(for: .widget) { Color.widgetBG }
        }
        .configurationDisplayName("Deadlines")
        .description("What is due, and how much you have studied this week.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MonthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.aleveldashboard.month", provider: Provider()) { entry in
            FortnightView(entry: entry)
                .containerBackground(for: .widget) { Color.widgetBG }
        }
        .configurationDisplayName("Month")
        .description("The month at a glance: school days, free days, deadlines and exams.")
        .supportedFamilies([.systemLarge, .systemExtraLarge])
    }
}

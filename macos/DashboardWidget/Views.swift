import SwiftUI
import WidgetKit

extension Color {
    /// The dashboard sends subject colours as hex; parse defensively.
    init(hex: String) {
        let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        self.init(.sRGB,
                  red:   Double((v >> 16) & 0xFF) / 255,
                  green: Double((v >> 8) & 0xFF) / 255,
                  blue:  Double(v & 0xFF) / 255,
                  opacity: 1)
    }
    static let widgetBG = Color(.sRGB, red: 0.078, green: 0.078, blue: 0.075, opacity: 1)
    static let ink      = Color.white
    static let dim      = Color.white.opacity(0.55)
    static let faint    = Color.white.opacity(0.30)
    static let late     = Color(hex: "e66767")
    static let soon     = Color(hex: "ec835a")
    static let accent   = Color(hex: "3987e5")
    static let good     = Color(hex: "1baf7a")
    static let free     = Color(hex: "eda100")     // holidays / non-school days
    static let exam     = Color(hex: "ec835a")
}

/// Shown whenever there is no feed — never a blank rectangle.
struct FallbackView: View {
    let error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("A Level").font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color.dim)
            Text(error ?? "Loading…")
                .font(.system(size: 11)).foregroundStyle(Color.faint)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct HeaderLine: View {
    let feed: Feed
    var body: some View {
        Text(feed.holiday ?? feed.term.map { "\($0.name) · week \($0.week)" } ?? "Out of term")
            .font(.system(size: 9.5, weight: .medium, design: .monospaced))
            .foregroundStyle(Color.dim)
            .textCase(.uppercase)
            .lineLimit(1)
    }
}

// MARK: - Deadlines

struct DeadlinesView: View {
    @Environment(\.widgetFamily) private var family
    let entry: Entry

    var body: some View {
        guard let feed = entry.feed else { return AnyView(FallbackView(error: entry.error)) }
        let rows = family == .systemSmall ? 3 : 5
        return AnyView(
            VStack(alignment: .leading, spacing: 0) {
                HeaderLine(feed: feed)
                if feed.homework.isEmpty {
                    Spacer()
                    Text("Nothing due")
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.dim)
                    Spacer()
                } else {
                    Spacer(minLength: 6)
                    ForEach(Array(feed.homework.prefix(rows).enumerated()), id: \.offset) { _, h in
                        HStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: h.colour)).frame(width: 6, height: 6)
                            Text(h.title).font(.system(size: 11)).foregroundStyle(Color.ink)
                                .lineLimit(1).truncationMode(.tail)
                            Spacer(minLength: 4)
                            Text(h.relative)
                                .font(.system(size: 9.5, weight: h.isLate ? .bold : .regular, design: .monospaced))
                                .foregroundStyle(h.isLate ? Color.late : h.isSoon ? Color.soon : Color.faint)
                        }
                        .padding(.vertical, 2.5)
                    }
                    Spacer(minLength: 4)
                }
                HoursBar(hours: feed.hours)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        )
    }
}

struct HoursBar: View {
    let hours: Feed.Hours
    var body: some View {
        let frac = hours.target > 0 ? min(hours.logged / hours.target, 1) : 0
        VStack(alignment: .leading, spacing: 3) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.10))
                    Capsule().fill(Color.accent).frame(width: geo.size.width * frac)
                }
            }
            .frame(height: 4)
            Text("\(hours.logged, specifier: "%.1f")h of \(hours.target, specifier: "%.0f")h this week")
                .font(.system(size: 9, design: .monospaced)).foregroundStyle(Color.faint)
        }
    }
}

// MARK: - Month

struct FortnightView: View {
    let entry: Entry

    var body: some View {
        guard let feed = entry.feed else { return AnyView(FallbackView(error: entry.error)) }
        let m = feed.month
        let cols = Array(repeating: GridItem(.flexible(), spacing: 2.5), count: 7)

        return AnyView(
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(m.label).font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.ink)
                    Spacer()
                    HeaderLine(feed: feed)
                }

                LazyVGrid(columns: cols, spacing: 3) {
                    ForEach(["M", "T", "W", "T", "F", "S", "S"].indices, id: \.self) { i in
                        Text(["M", "T", "W", "T", "F", "S", "S"][i])
                            .font(.system(size: 8, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.faint)
                            .frame(maxWidth: .infinity)
                    }
                    ForEach(0..<m.lead, id: \.self) { _ in Color.clear.frame(height: 1) }
                    ForEach(m.days, id: \.iso) { MonthCell(day: $0) }
                }

                Spacer(minLength: 0)
                Legend()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        )
    }
}

/// One day. Fill says what kind of day it is; the markers say what is on it.
struct MonthCell: View {
    let day: Feed.Day

    private var fill: Color {
        if day.holiday != nil { return Color.free.opacity(0.22) }
        if day.school         { return Color.accent.opacity(0.16) }
        return Color.white.opacity(0.04)                       // weekend / out of term
    }
    private var number: Color {
        if day.today          { return Color.accent }
        if day.holiday != nil { return Color.free }
        if day.school         { return Color.ink.opacity(0.92) }
        return Color.faint
    }

    var body: some View {
        VStack(spacing: 2) {
            Text("\(day.dom)")
                .font(.system(size: 11, weight: day.today ? .bold : .medium, design: .monospaced))
                .foregroundStyle(number)
            HStack(spacing: 2) {
                if day.due > 0 {
                    Circle().fill(Color.late).frame(width: 4, height: 4)
                    if day.due > 1 {
                        Text("\(day.due)").font(.system(size: 7, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color.late)
                    }
                }
                if day.exam { RoundedRectangle(cornerRadius: 1).fill(Color.exam).frame(width: 7, height: 3) }
            }
            .frame(height: 4)
        }
        .frame(maxWidth: .infinity, minHeight: 30)
        .padding(.vertical, 2)
        .background(RoundedRectangle(cornerRadius: 5).fill(fill))
        .overlay(
            RoundedRectangle(cornerRadius: 5)
                .strokeBorder(day.today ? Color.accent : .clear, lineWidth: 1.5)
        )
    }
}

struct Legend: View {
    var body: some View {
        HStack(spacing: 9) {
            key(Color.accent.opacity(0.5), "school")
            key(Color.free.opacity(0.6), "free")
            key(Color.late, "due")
            key(Color.exam, "exam")
            Spacer()
        }
        .font(.system(size: 7.5, design: .monospaced))
        .foregroundStyle(Color.faint)
    }

    private func key(_ c: Color, _ label: String) -> some View {
        HStack(spacing: 3) {
            RoundedRectangle(cornerRadius: 1.5).fill(c).frame(width: 7, height: 7)
            Text(label)
        }
    }
}

// MARK: - Today

/// The day's lessons with a live bar through whichever one is running.
/// The timeline provider supplies an entry per period boundary, so this stays
/// correct without the widget calling the server every minute.
struct TodayView: View {
    let entry: Entry

    private var nowMin: Int {
        let c = Calendar.current.dateComponents([.hour, .minute], from: entry.date)
        return (c.hour ?? 0) * 60 + (c.minute ?? 0)
    }

    var body: some View {
        guard let feed = entry.feed else { return AnyView(FallbackView(error: entry.error)) }
        // The feed names the day it describes. If that is not today, the data is
        // stale — say so rather than showing yesterday's lessons as if current.
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        guard df.string(from: entry.date) == feed.today else {
            return AnyView(FallbackView(error: "Updating…"))
        }
        let lessons = feed.todayLessons
        let current = lessons.first { $0.isNow(at: nowMin) }
        let next = lessons.first { ($0.startMin ?? 0) > nowMin }

        return AnyView(
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(entry.date.formatted(.dateTime.weekday(.wide)))
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.ink)
                    if let w = feed.week {
                        Text("week \(w)")
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.accent)
                    }
                    Spacer()
                    if let h = feed.holiday {
                        Text(h).font(.system(size: 9, design: .monospaced)).foregroundStyle(Color.free)
                    }
                }

                if lessons.isEmpty {
                    Spacer()
                    Text(feed.holiday ?? "No lessons today")
                        .font(.system(size: 13, weight: .medium)).foregroundStyle(Color.dim)
                    Spacer()
                } else {
                    ForEach(Array(lessons.enumerated()), id: \.offset) { _, l in
                        LessonRow(lesson: l, nowMin: nowMin, isCurrent: l.isNow(at: nowMin))
                    }
                    Spacer(minLength: 2)
                    Text(current.map { "Now: \($0.name)\($0.room.isEmpty ? "" : " · \($0.room)")" }
                         ?? next.map { "Next: \($0.name) at \($0.start)" }
                         ?? "Day finished")
                        .font(.system(size: 9.5, design: .monospaced))
                        .foregroundStyle(current != nil ? Color.accent : Color.faint)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        )
    }
}

struct LessonRow: View {
    let lesson: Feed.Lesson
    let nowMin: Int
    let isCurrent: Bool

    private var done: Bool { (lesson.endMin ?? 0) <= nowMin }

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 6) {
                Text(lesson.period)
                    .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.faint).frame(width: 14, alignment: .leading)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: lesson.colour)).frame(width: 6, height: 6)
                Text(lesson.name)
                    .font(.system(size: 11, weight: isCurrent ? .semibold : .regular))
                    .foregroundStyle(done ? Color.faint : Color.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text(lesson.room.isEmpty ? lesson.start : lesson.room)
                    .font(.system(size: 8.5, design: .monospaced))
                    .foregroundStyle(Color.faint)
            }
            // the live bar: only the running lesson gets one
            if isCurrent {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.12))
                        Capsule().fill(Color(hex: lesson.colour))
                            .frame(width: geo.size.width * lesson.progress(at: nowMin))
                    }
                }
                .frame(height: 3)
                .padding(.leading, 20)
            }
        }
        .padding(.vertical, 1.5)
        .opacity(done ? 0.55 : 1)
    }
}

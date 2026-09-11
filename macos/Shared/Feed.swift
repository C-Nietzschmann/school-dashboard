import Foundation

/* The shape the dashboard's /api/widget endpoint returns. Decoding is
   deliberately forgiving — a widget that crashes on an unexpected field is
   worse than one showing slightly less. */

struct Feed: Decodable {
    let today: String
    let term: Term?
    let holiday: String?
    let hours: Hours
    let overdue: Int
    let homework: [Item]
    let week: String?
    let todayLessons: [Lesson]
    let periods: [Period]
    let month: Month

    struct Term: Decodable { let name: String; let week: Int }
    struct Hours: Decodable { let logged: Double; let target: Double }

    struct Item: Decodable {
        let title: String
        let due: String?
        let days: Int?
        let name: String
        let colour: String
    }

    struct Lesson: Decodable {
        let period: String
        let start: String
        let end: String
        let room: String
        let name: String
        let short: String?
        let colour: String
    }

    struct Period: Decodable {
        let id: String
        let start: String
        let end: String
        let label: String?
    }

    struct Month: Decodable {
        let label: String
        let lead: Int          // blank cells before the 1st, Monday-first
        let days: [Day]
    }

    struct Day: Decodable {
        let iso: String
        let dom: Int
        let today: Bool
        let weekend: Bool
        let holiday: String?
        let school: Bool
        let lessons: Int
        let due: Int
        let exam: Bool
        let examLabel: String?
    }
}

enum FeedError: LocalizedError {
    case notConfigured, unauthorised, offline(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "Set the dashboard URL and token in Config.swift"
        case .unauthorised:  return "Widget token rejected — check WIDGET_TOKEN"
        case .offline(let m): return m
        }
    }
}

enum FeedLoader {
    static func load() async throws -> Feed {
        guard !Config.token.isEmpty, var comps = URLComponents(string: Config.baseURL + "/api/widget")
        else { throw FeedError.notConfigured }
        comps.queryItems = [URLQueryItem(name: "token", value: Config.token)]
        guard let url = comps.url else { throw FeedError.notConfigured }

        var req = URLRequest(url: url)
        // The free tier sleeps; a cold start can take the better part of a minute.
        req.timeoutInterval = 60
        req.cachePolicy = .reloadIgnoringLocalCacheData

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            if let http = resp as? HTTPURLResponse, http.statusCode == 401 { throw FeedError.unauthorised }
            return try JSONDecoder().decode(Feed.self, from: data)
        } catch let e as FeedError {
            throw e
        } catch {
            throw FeedError.offline(error.localizedDescription)
        }
    }
}

extension Feed.Lesson {
    /// Minutes since midnight, or nil if the time is malformed.
    static func minutes(_ hhmm: String) -> Int? {
        let parts = hhmm.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }
    var startMin: Int? { Self.minutes(start) }
    var endMin: Int? { Self.minutes(end) }

    /// 0 before it begins, 1 once it has ended, the fraction through otherwise.
    func progress(at nowMin: Int) -> Double {
        guard let s = startMin, let e = endMin, e > s else { return 0 }
        if nowMin <= s { return 0 }
        if nowMin >= e { return 1 }
        return Double(nowMin - s) / Double(e - s)
    }
    func isNow(at nowMin: Int) -> Bool {
        guard let s = startMin, let e = endMin else { return false }
        return nowMin >= s && nowMin < e
    }
}

extension Feed.Item {
    /// "2d late", "today", "in 3d" — the phrasing a glance needs.
    var relative: String {
        guard let d = days else { return "" }
        if d < 0 { return "\(-d)d late" }
        if d == 0 { return "today" }
        if d == 1 { return "tomorrow" }
        return "in \(d)d"
    }
    var isLate: Bool { (days ?? 0) < 0 }
    var isSoon: Bool { (days ?? 99) >= 0 && (days ?? 99) <= 2 }
}

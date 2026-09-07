import { auth } from "@/auth";
import { getRecentObfuscationLogs } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPage() {
	const session = await auth();

	// Middleware already blocks non-admins from /admin, but double-check here
	// too in case this page is ever reached a different way.
	if (!session?.user?.isAdmin) {
		redirect("/");
	}

	const logs = await getRecentObfuscationLogs(200);

	return (
		<main className="min-h-screen bg-slate-950 text-white p-6">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold">แผงควบคุมหลังบ้าน</h1>
						<p className="text-sm text-gray-400">ประวัติการใช้งานล่าสุด {logs.length} รายการ</p>
					</div>
					<a href="/" className="text-sm text-blue-400 hover:underline">
						&larr; กลับหน้าหลัก
					</a>
				</div>

				<div className="overflow-x-auto rounded-xl border border-white/10">
					<table className="w-full text-sm">
						<thead className="bg-white/5 text-left text-gray-300">
							<tr>
								<th className="p-3 font-medium">ผู้ใช้</th>
								<th className="p-3 font-medium">เวลา</th>
								<th className="p-3 font-medium">ขนาด (เข้า/ออก)</th>
								<th className="p-3 font-medium">ตัวเลือกที่ใช้</th>
								<th className="p-3 font-medium">โค้ด</th>
							</tr>
						</thead>
						<tbody>
							{logs.map(log => (
								<tr key={log.id} className="border-t border-white/10 align-top hover:bg-white/5">
									<td className="p-3 whitespace-nowrap">
										<div className="flex items-center gap-2">
											{log.avatar_url && (
												// eslint-disable-next-line @next/next/no-img-element
												<img src={log.avatar_url} alt="" className="w-6 h-6 rounded-full" />
											)}
											<div>
												<div className="font-medium">{log.username}</div>
												<div className="text-xs text-gray-500 font-mono">{log.discord_id}</div>
											</div>
										</div>
									</td>
									<td className="p-3 whitespace-nowrap text-gray-400">{formatDate(log.created_at)}</td>
									<td className="p-3 whitespace-nowrap text-gray-400">
										{log.input_length.toLocaleString()} &rarr; {log.output_length.toLocaleString()} ตัวอักษร
									</td>
									<td className="p-3 text-xs text-gray-400 max-w-[220px]">
										<pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.options, null, 0)}</pre>
									</td>
									<td className="p-3 max-w-[320px]">
										<details>
											<summary className="cursor-pointer text-blue-400 text-xs">ดูโค้ด</summary>
											<pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs bg-black/40 p-2 rounded-lg">
												{log.input_code}
											</pre>
										</details>
									</td>
								</tr>
							))}
							{logs.length === 0 && (
								<tr>
									<td colSpan={5} className="p-6 text-center text-gray-500">
										ยังไม่มีข้อมูล
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</main>
	);
}

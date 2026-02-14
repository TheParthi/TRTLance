"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bookmark,
  BookmarkCheck
} from "lucide-react";

interface Bookmark {
  id: number;
  title: string;
  type: "project" | "contest";
  featured: boolean;
  bidsOrEntries: number;
  startDate: string;
  endDate: string;
  price: number;
}

const initialBookmarks: Bookmark[] = [
  // Empty by default to show empty state
];

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);

  const handleToggleBookmark = (id: number) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bookmarked Projects and Contests</h1>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                    Project / Contest
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                    Bids / Entries
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                    Ends
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                    Price (INR)
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium uppercase tracking-wider">
                    Bookmark
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {bookmarks.length === 0 ? (
                  // Empty State Row
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No projects or contests found.
                    </td>
                  </tr>
                ) : (
                  // Bookmark Rows
                  bookmarks.map((bookmark) => (
                    <tr key={bookmark.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <button className="text-blue-600 hover:text-blue-800 font-medium text-left">
                            {bookmark.title}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={bookmark.type === "project" ? "default" : "secondary"}>
                              {bookmark.type === "project" ? "Project" : "Contest"}
                            </Badge>
                            {bookmark.featured && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bookmark.bidsOrEntries}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bookmark.startDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bookmark.endDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        ₹{bookmark.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleBookmark(bookmark.id)}
                          className="text-yellow-500 hover:text-yellow-600 transition-colors"
                        >
                          <BookmarkCheck className="h-5 w-5 fill-current" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing {bookmarks.length > 0 ? 1 : 0} to {bookmarks.length} of {bookmarks.length} entries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
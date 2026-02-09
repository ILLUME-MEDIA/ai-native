import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Index() {
    const { props } = usePage();
    const { entities = [] } = props;

    return (
        <>
            <Head title="Section Builder" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-xl font-semibold">Section Builder</h1>
                                <Link
                                    href="#"
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    New Table
                                </Link>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                This view will become the central place to manage dynamic tables, fields,
                                visibility, and AI/MCP access. For now it lists detected entities.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Name
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Table
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Source
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Fields
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                MCP Enabled
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {entities.map((entity) => (
                                            <tr key={entity.id}>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {entity.name}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {entity.table_name}
                                                    </code>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                    {entity.source_type}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                    {entity.fields_count}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            entity.mcp_enabled
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {entity.mcp_enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {entities.length === 0 && (
                                            <tr>
                                                <td
                                                    className="px-4 py-6 text-center text-gray-500"
                                                    colSpan={5}
                                                >
                                                    No entities detected yet. Once migrations run and
                                                    tables exist, they will appear here.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


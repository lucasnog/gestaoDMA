import sys
path = 'src/pages/Contratos.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1 - Header
old_h = '<th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">\n                  Contrato\n                </th>'
new_h = '<th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">\n                  Contrato\n                </th>'
content = content.replace(old_h, new_h)

old_h2 = '<th onClick={() => handleSort(' + "'lote'" + ')} className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">\n                  Lote'
new_h2 = '<th onClick={() => handleSort(' + "'lote'" + ')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">\n                  Lote'
content = content.replace(old_h2, new_h2)

# Objeto / Empresa -> Objeto
old_obj = 'Objeto / Empresa'
content = content.replace(old_obj, 'Objeto')

# px-6 py-4 in remaining headers
for search in ['Investimento', 'Prazo', 'Status']:
    old = 'px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider' + (' text-center' if search == 'Status' else '') + (' cursor-pointer hover:text-emerald-600 select-none' if search != 'Status' else '') + '">\n                  ' + search
    new = 'px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider' + (' text-center' if search == 'Status' else '') + (' cursor-pointer hover:text-emerald-600 select-none' if search != 'Status' else '') + '">\n                  ' + search
    content = content.replace(old, new)

# Execucao header -> Avanco Fin.
content = content.replace('px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">\n                  Execução', 'px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">\n                  Avanço Fin.')

# Remove acao header
content = content.replace('<th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Ação</th>\n              </tr>', '</tr>')

# 2 - skeleton
old_sk = '''                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-8 ml-auto" /></td>'''
new_sk = '''                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>'''
content = content.replace(old_sk, new_sk)

# 3 - colspan
content = content.replace('colSpan="8"', 'colSpan="7"')

# 4 - Data cells padding
for col_tag in ['<td className="px-6 py-4">', '<td className="px-6 py-4 max-w-[280px]">', '<td className="px-6 py-4 text-center">']:
    content = content.replace(col_tag, col_tag.replace('px-6 py-4', 'px-4 py-3'))

# 5 - Execucao cell -> Avanco Fin with progress bar
old_exec = '''<span className={`text-sm font-bold ${isCritical ? 'text-red-500' : 'text-slate-900'}`}>
                            {perc_pago.toFixed(1)}%
                          </span>
                        </td>
                      '''
new_exec = '''<div className="flex items-center gap-2">
                            <span className={`text-sm font-bold whitespace-nowrap ${isCritical ? 'text-red-500' : 'text-slate-900'}`}>
                              {perc_pago.toFixed(1)}%
                            </span>
                            <div className="w-12 sm:w-16">
                              <ProgressBar progress={perc_pago} size="sm" />
                            </div>
                          </div>
                        </td>
                      '''
idx = content.find(old_exec)
if idx >= 0:
    content = content.replace(old_exec, new_exec)

# 6 - Remove acao cell
old_acao = '''<td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                          <ArrowRight size={16} strokeWidth={2} />
                        </div>
                      </td>'''
# also try with px-4
old_acao2 = old_acao.replace('px-6', 'px-4')
if old_acao in content:
    content = content.replace(old_acao, '')
if old_acao2 in content:
    content = content.replace(old_acao2, '')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')

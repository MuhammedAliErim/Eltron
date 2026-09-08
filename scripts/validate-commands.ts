import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { commands } from '../src/commands';

let issues = 0;

for (const cmd of commands) {
  try {
    const json = JSON.parse(JSON.stringify(cmd.data.toJSON()));
    
    // Validate name
    if (!json.name || typeof json.name !== 'string') {
      console.error(`[${json.name}] FAIL: missing/invalid name`);
      issues++;
    } else if (json.name.length > 32) {
      console.error(`[${json.name}] FAIL: name too long (${json.name.length})`);
      issues++;
    } else if (!/^[a-z0-9_-]+$/.test(json.name)) {
      console.error(`[${json.name}] FAIL: invalid chars in name`);
      issues++;
    }
    
    // Validate description
    if (!json.description || typeof json.description !== 'string') {
      console.error(`[${json.name}] FAIL: missing/invalid description`);
      issues++;
    } else if (json.description.length > 100) {
      console.error(`[${json.name}] FAIL: description too long (${json.description.length})`);
      issues++;
    }
    
    // Validate options
    if (json.options) {
      if (json.options.length > 25) {
        console.error(`[${json.name}] FAIL: too many options (${json.options.length})`);
        issues++;
      }
      
      for (const opt of json.options) {
        if (!opt.name || opt.name.length > 32) {
          console.error(`[${json.name}] FAIL: option name invalid: "${opt.name}"`);
          issues++;
        }
        if (opt.description && opt.description.length > 100) {
          console.error(`[${json.name}] FAIL: option "${opt.name}" description too long (${opt.description.length})`);
          issues++;
        }
        
        // Validate choices
        if (opt.choices) {
          if (opt.choices.length > 25) {
            console.error(`[${json.name}] FAIL: option "${opt.name}" has too many choices (${opt.choices.length})`);
            issues++;
          }
          for (const choice of opt.choices) {
            if (!choice.name || choice.name.length > 100) {
              console.error(`[${json.name}] FAIL: choice name invalid in "${opt.name}": "${choice.name}"`);
              issues++;
            }
            if (!choice.value || String(choice.value).length > 100) {
              console.error(`[${json.name}] FAIL: choice value invalid in "${opt.name}": "${choice.value}"`);
              issues++;
            }
          }
        }
        
        // Recurse into subcommands
        if (opt.options) {
          for (const subOpt of opt.options) {
            if (!subOpt.name || subOpt.name.length > 32) {
              console.error(`[${json.name}] FAIL: sub opt name invalid in "${opt.name}": "${subOpt.name}"`);
              issues++;
            }
            if (subOpt.description && subOpt.description.length > 100) {
              console.error(`[${json.name}] FAIL: sub opt "${subOpt.name}" desc too long (${subOpt.description.length})`);
              issues++;
            }
            if (subOpt.choices) {
              for (const choice of subOpt.choices) {
                if (!choice.name || choice.name.length > 100) {
                  console.error(`[${json.name}] FAIL: sub choice name invalid in "${subOpt.name}": "${choice.name}"`);
                  issues++;
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`[OK] ${json.name} (${json.options?.length || 0} options)`);
  } catch (err: any) {
    console.error(`[FAIL] ${cmd.data.name}: ${err.message}`);
    issues++;
  }
}

console.log(`\nTotal: ${commands.length} commands, ${issues} issues`);
process.exit(issues > 0 ? 1 : 0);
